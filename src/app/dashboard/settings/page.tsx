"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { agenciesApi, UpdateAgencyPayload } from "@/lib/api/agencies";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { formatApiErrorMessage } from "@/lib/errors";
import { Building2, Save, PlusCircle, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const { activeAgency, refreshAgencies } = useAuth();
  const agencyId = activeAgency?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [city, setCity] = useState("");

  // New Agency Form
  const [isRegisteringNew, setIsRegisteringNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState("");

  useEffect(() => {
    if (activeAgency) {
      setName(activeAgency.name || "");
      setBusinessName(activeAgency.businessName || "");
      setContactEmail(activeAgency.contactEmail || "");
      setContactPhone(activeAgency.contactPhoneMasked || "");
      setCity(activeAgency.city || "");
    }
  }, [activeAgency]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateAgencyPayload) =>
      agenciesApi.updateAgency(agencyId!, payload),
    onSuccess: async () => {
      toast("Agency details updated successfully", "success");
      await refreshAgencies();
      queryClient.invalidateQueries({ queryKey: ["agency-manage", agencyId] });
    },
    onError: (err) => {
      toast(formatApiErrorMessage(err), "error");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: { name: string; contactEmail: string; contactPhone: string; city?: string }) =>
      agenciesApi.registerAgency(payload),
    onSuccess: async () => {
      toast("New agency registered under your account", "success");
      setIsRegisteringNew(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewCity("");
      await refreshAgencies();
    },
    onError: (err) => {
      toast(formatApiErrorMessage(err), "error");
    },
  });

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyId) return;
    updateMutation.mutate({
      name: name.trim(),
      businessName: businessName.trim() || undefined,
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      city: city.trim() || undefined,
    });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPhone.trim()) return;
    registerMutation.mutate({
      name: newName.trim(),
      contactEmail: newEmail.trim(),
      contactPhone: newPhone.trim(),
      city: newCity.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <TopNav
        title="Agency Fleet Settings"
        subtitle="Configure agency fleet metadata, contact endpoints, and profile details"
      />

      <div className="px-6 space-y-6 max-w-4xl">
        {/* Active Agency Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <CardTitle>Agency Profile & Contact Information</CardTitle>
            </div>
            <CardDescription>
              Authoritative agency metadata used in student and driver communications.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleUpdateSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Agency Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Official Business / Legal Entity Name"
                  placeholder="e.g. Pune City Transit Services LLP"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Primary Contact Email *"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
                <Input
                  label="Contact Phone *"
                  placeholder="+919876543210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Operational City"
                placeholder="e.g. Pune"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Tenant Isolation: Modifications are strictly applied to agency ID: <span className="font-mono text-slate-700">{agencyId || "None"}</span></span>
              </div>
            </CardContent>

            <CardFooter className="pt-2 flex justify-end">
              <Button type="submit" isLoading={updateMutation.isPending} className="gap-1.5">
                <Save className="h-4 w-4" />
                Save Agency Settings
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Register Secondary Agency Card */}
        <Card className="border-dashed border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">Register Another Agency</CardTitle>
                <CardDescription>
                  Owners can operate multiple independent mobility agencies within their account.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRegisteringNew((prev) => !prev)}
                className="gap-1.5"
              >
                <PlusCircle className="h-4 w-4" />
                {isRegisteringNew ? "Hide Form" : "New Agency"}
              </Button>
            </div>
          </CardHeader>

          {isRegisteringNew && (
            <form onSubmit={handleRegisterSubmit}>
              <CardContent className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Agency Name *"
                    placeholder="e.g. Pune South Shuttle Fleet"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                  <Input
                    label="City *"
                    placeholder="e.g. Pune"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Contact Email *"
                    type="email"
                    placeholder="south@agency.isahara.app"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                  <Input
                    label="Contact Phone *"
                    placeholder="+919876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-2">
                <Button type="submit" isLoading={registerMutation.isPending} size="sm">
                  Register Agency
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
