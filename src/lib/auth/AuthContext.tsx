"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Agency } from "@/types";
import { authStorage } from "@/lib/api/client";
import { authApi } from "@/lib/api/auth";
import { agenciesApi } from "@/lib/api/agencies";

interface AuthContextType {
  user: User | null;
  ownedAgencies: Agency[];
  activeAgency: Agency | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAgencyOwner: boolean;
  isAdmin: boolean;
  error: string | null;
  loginWithToken: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setActiveAgency: (agency: Agency) => void;
  refreshAgencies: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVE_AGENCY_KEY = "ishaara_active_agency_id";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ownedAgencies, setOwnedAgencies] = useState<Agency[]>([]);
  const [activeAgency, setActiveAgencyState] = useState<Agency | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgencyState = useCallback(async (): Promise<Agency[]> => {
    try {
      const agencies = await agenciesApi.getMyOwnedAgencies();
      setOwnedAgencies(agencies);

      const savedAgencyId =
        typeof window !== "undefined" ? localStorage.getItem(ACTIVE_AGENCY_KEY) : null;

      if (agencies.length > 0) {
        const found = agencies.find((a) => a.id === savedAgencyId);
        const selected = found || agencies[0];
        setActiveAgencyState(selected);
        if (typeof window !== "undefined") {
          localStorage.setItem(ACTIVE_AGENCY_KEY, selected.id);
        }
      } else {
        setActiveAgencyState(null);
      }
      return agencies;
    } catch {
      setOwnedAgencies([]);
      setActiveAgencyState(null);
      return [];
    }
  }, []);

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const token = authStorage.getToken();

    if (!token) {
      setUser(null);
      setOwnedAgencies([]);
      setActiveAgencyState(null);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Authoritative user check from backend
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);

      // 2. Resolve owned agencies
      await fetchAgencyState();
    } catch (err: unknown) {
      authStorage.clearToken();
      setUser(null);
      setOwnedAgencies([]);
      setActiveAgencyState(null);
      const message = err instanceof Error ? err.message : "Failed to restore session";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAgencyState]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const loginWithToken = async (token: string, signedInUser: User) => {
    setIsLoading(true);
    setError(null);
    authStorage.setToken(token);
    setUser(signedInUser);

    try {
      await fetchAgencyState();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load agency";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.signOut();
    } catch {
      // Ignore network errors on logout
    } finally {
      authStorage.clearToken();
      if (typeof window !== "undefined") {
        localStorage.removeItem(ACTIVE_AGENCY_KEY);
      }
      setUser(null);
      setOwnedAgencies([]);
      setActiveAgencyState(null);
    }
  };

  const setActiveAgency = (agency: Agency) => {
    // Only allow setting if the agency belongs to owned agencies
    const exists = ownedAgencies.some((a) => a.id === agency.id);
    if (exists) {
      setActiveAgencyState(agency);
      if (typeof window !== "undefined") {
        localStorage.setItem(ACTIVE_AGENCY_KEY, agency.id);
      }
    }
  };

  const refreshAgencies = async () => {
    await fetchAgencyState();
  };

  const isAuthenticated = !!user;
  // An authorized agency owner is an authenticated user who is NOT a pure passenger/driver and owns at least 1 agency
  const isAgencyOwner =
    isAuthenticated &&
    user.role !== "USER" &&
    user.role !== "DRIVER_CONDUCTOR" &&
    ownedAgencies.length > 0;

  const isAdmin = isAuthenticated && user.role === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        ownedAgencies,
        activeAgency,
        isLoading,
        isAuthenticated,
        isAgencyOwner,
        isAdmin,
        error,
        loginWithToken,
        logout,
        setActiveAgency,
        refreshAgencies,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
