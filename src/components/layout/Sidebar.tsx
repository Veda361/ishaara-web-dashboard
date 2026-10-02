"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Bus,
  Link2,
  Navigation2,
  Activity,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Menu,
  X,
  Landmark,
  ShieldAlert,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Drivers", href: "/dashboard/drivers", icon: Users },
  { label: "Vehicles", href: "/dashboard/vehicles", icon: Bus },
  { label: "Assignments", href: "/dashboard/assignments", icon: Link2 },
  { label: "Trips", href: "/dashboard/trips", icon: Navigation2 },
  { label: "Operations", href: "/dashboard/operations", icon: Activity },
  { label: "Settlements", href: "/dashboard/settlements", icon: Landmark },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, activeAgency, ownedAgencies, setActiveAgency, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = useState(false);

  const navContent = (
    <div className="flex h-full flex-col justify-between p-4 bg-slate-900 text-white select-none">
      {/* Brand & Agency Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 pt-2">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center font-black text-lg text-white shadow-md shadow-indigo-500/20">
              IS
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">
                ISHAARA
              </span>
              <span className="text-[10px] tracking-wider uppercase text-indigo-400 font-semibold block">
                Agency Fleet
              </span>
            </div>
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Agency Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setIsAgencyDropdownOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Building2 className="h-4 w-4 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {activeAgency ? activeAgency.name : "Select Agency"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {activeAgency?.city || "Fleet Agency"}
                </p>
              </div>
            </div>
            {ownedAgencies.length > 1 && (
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
            )}
          </button>

          {isAgencyDropdownOpen && ownedAgencies.length > 1 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 p-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-30 space-y-1">
              {ownedAgencies.map((agency) => (
                <button
                  key={agency.id}
                  onClick={() => {
                    setActiveAgency(agency);
                    setIsAgencyDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between",
                    activeAgency?.id === agency.id
                      ? "bg-indigo-600 text-white font-medium"
                      : "text-slate-300 hover:bg-slate-700/80"
                  )}
                >
                  <span className="truncate">{agency.name}</span>
                  {activeAgency?.id === agency.id && (
                    <span className="text-[10px] bg-indigo-500/50 px-1.5 py-0.5 rounded">Active</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user?.role === "ADMIN" && (
            <div className="pt-3 border-t border-slate-800/60 mt-3">
              <Link
                href="/admin/settlements"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Admin Console</span>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Footer / User Profile */}
      <div className="pt-4 border-t border-slate-800/80 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs uppercase border border-slate-600">
            {user?.name?.slice(0, 2) || "AO"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || "Agency Owner"}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-sm text-white">
            IS
          </div>
          <span className="font-bold text-sm tracking-tight">ISHAARA</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-1 rounded-lg text-slate-400 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex w-72 max-w-xs flex-1 flex-col z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
