"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { agenciesApi, RegisterAgencyPayload } from "@/lib/api/agencies";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { formatApiErrorMessage } from "@/lib/errors";
import { Building2 } from "lucide-react";

export interface CreateAgencyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateAgencyDialog({ isOpen, onClose, onSuccess }: CreateAgencyDialogProps) {
  const { user, refreshAgencies } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [city, setCity] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize contactEmail from authenticated user session
  useEffect(() => {
    if (isOpen) {
      if (user?.email) {
        setContactEmail(user.email);
      }
      setErrorMessage(null);
    }
  }, [isOpen, user?.email]);

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterAgencyPayload) => agenciesApi.registerAgency(payload),
    onSuccess: async () => {
      toast("Agency profile created successfully", "success");
      setName("");
      setBusinessName("");
      setContactEmail("");
      setContactPhone("");
      setCity("");
      setErrorMessage(null);

      await refreshAgencies();
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      queryClient.invalidateQueries({ queryKey: ["agency-manage"] });

      onClose();
      onSuccess?.();
    },
    onError: (err) => {
      const msg = formatApiErrorMessage(err);
      setErrorMessage(msg);
      toast(msg, "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = contactEmail.trim();
    const trimmedPhone = contactPhone.trim();
    const trimmedCity = city.trim();
    const trimmedBusiness = businessName.trim();

    if (!trimmedName) {
      setErrorMessage("Agency name is required.");
      return;
    }
    if (!trimmedEmail) {
      setErrorMessage("Contact email is required.");
      return;
    }
    if (!trimmedPhone) {
      setErrorMessage("Contact phone number is required.");
      return;
    }

    registerMutation.mutate({
      name: trimmedName,
      contactEmail: trimmedEmail,
      contactPhone: trimmedPhone,
      city: trimmedCity || undefined,
      businessName: trimmedBusiness || undefined,
    });
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!registerMutation.isPending) {
          onClose();
        }
      }}
      title="Create Agency Profile"
      description="Register your mobility agency to activate fleet management, driver onboarding, and trip dispatching."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <Alert variant="danger" title="Registration Failed">
            {errorMessage}
          </Alert>
        )}

        <div className="space-y-4">
          <Input
            id="agency-name"
            label="Agency Name *"
            placeholder="e.g. Pune Metro Transit Agency"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={registerMutation.isPending}
            required
            autoFocus
          />

          <Input
            id="agency-business-name"
            label="Official Business / Legal Entity Name"
            placeholder="e.g. PMTA Mobility Services Pvt Ltd (Optional)"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            disabled={registerMutation.isPending}
            helperText="Legal registered entity name for tax and invoicing"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="agency-contact-email"
              label="Contact Email *"
              type="email"
              placeholder="admin@agency.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={registerMutation.isPending}
              required
            />

            <Input
              id="agency-contact-phone"
              label="Contact Phone *"
              placeholder="+919876543210"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              disabled={registerMutation.isPending}
              required
            />
          </div>

          <Input
            id="agency-city"
            label="Operational City"
            placeholder="e.g. Pune"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={registerMutation.isPending}
            helperText="Primary city where your fleet operates"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={registerMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={registerMutation.isPending}
            className="gap-2"
          >
            <Building2 className="h-4 w-4" />
            Create Agency
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
