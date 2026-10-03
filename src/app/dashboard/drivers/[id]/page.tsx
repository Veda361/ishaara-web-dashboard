"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { membershipsApi } from "@/lib/api/memberships";
import { AgencyMembership } from "@/types";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { formatApiErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  User,
  Info,
} from "lucide-react";
import Link from "next/link";

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeAgency } = useAuth();

  const rawId = typeof params.id === "string" ? params.id : "";
  const agencyId = activeAgency?.id;

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  // Step 1: Query agency memberships to resolve whether rawId is a direct membershipId or a driverId
  const {
    data: membershipsList,
    isLoading: isListLoading,
    error: listError,
  } = useQuery({
    queryKey: ["agency-memberships", agencyId, "resolve-list"],
    queryFn: () => (agencyId ? membershipsApi.listMemberships(agencyId, { limit: 50 }) : null),
    enabled: !!agencyId && !!rawId,
    staleTime: 30000,
  });

  const cachedItems = React.useMemo(() => {
    if (!agencyId) return [];
    const cachedQueries = queryClient.getQueriesData<{ items?: AgencyMembership[] }>({
      queryKey: ["agency-memberships", agencyId],
    });
    const items: AgencyMembership[] = [];
    for (const [, data] of cachedQueries) {
      if (data?.items) {
        items.push(...data.items);
      }
    }
    return items;
  }, [queryClient, agencyId]);

  const allKnownMemberships = React.useMemo(() => {
    const listItems = membershipsList?.items || [];
    const map = new Map<string, AgencyMembership>();
    for (const item of [...cachedItems, ...listItems]) {
      if (item && item.id) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  }, [cachedItems, membershipsList]);

  // Check direct membership match or match by driverId
  const directMembershipMatch = React.useMemo(
    () => allKnownMemberships.find((m) => m.id === rawId),
    [allKnownMemberships, rawId]
  );
  const driverMembershipMatch = React.useMemo(
    () =>
      allKnownMemberships.find(
        (m) => m.driverId === rawId || m.driver?.id === rawId
      ),
    [allKnownMemberships, rawId]
  );

  const resolvedFromList = directMembershipMatch || driverMembershipMatch;
  const resolvedMembershipId = resolvedFromList?.id || null;

  // Canonicalize URL to membership ID if route was opened with a driverId
  React.useEffect(() => {
    if (
      driverMembershipMatch &&
      rawId !== driverMembershipMatch.id &&
      driverMembershipMatch.id
    ) {
      router.replace(`/dashboard/drivers/${driverMembershipMatch.id}`);
    }
  }, [driverMembershipMatch, rawId, router]);

  // Step 2: Fetch single membership details using the authoritative membershipId ONLY
  const {
    data: membershipDetail,
    isLoading: isMembershipLoading,
    error: membershipError,
    refetch,
  } = useQuery({
    queryKey: ["agency-membership", agencyId, resolvedMembershipId],
    queryFn: () =>
      agencyId && resolvedMembershipId
        ? membershipsApi.getMembership(agencyId, resolvedMembershipId)
        : null,
    enabled: !!agencyId && !!resolvedMembershipId,
    initialData: resolvedFromList || undefined,
    initialDataUpdatedAt: 0,
    staleTime: 0,
  });

  const membership = membershipDetail || resolvedFromList || null;
  const driver = membership?.driver;
  const verificationStatus =
    driver?.verificationStatus ||
    driver?.driverVerificationStatus ||
    "PENDING";
  const driverStatus =
    driver?.status ||
    driver?.driverStatus ||
    "OFFLINE";
  const licenseNumber =
    driver?.licenseNumber ||
    driver?.licenseNumberMasked ||
    "Verified at verification stage";
  const isPending = membership?.status === "PENDING";
  const isLoading = (isListLoading && !membership) || (isMembershipLoading && !membership);
  const error = listError || membershipError;

  const approveMutation = useMutation({
    mutationFn: () => {
      const targetMembershipId = resolvedMembershipId || membership?.id;
      if (!agencyId || !targetMembershipId) {
        throw new Error("Missing agency ID or membership ID for approval.");
      }
      return membershipsApi.approveMembership(agencyId, targetMembershipId);
    },
    onSuccess: () => {
      toast("Driver membership approved successfully", "success");
      setIsApproveOpen(false);
      if (agencyId && resolvedMembershipId) {
        queryClient.invalidateQueries({
          queryKey: ["agency-membership", agencyId, resolvedMembershipId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["agency-memberships", agencyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["agency-manage", agencyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["agency-pending-memberships", agencyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["agency-approved-drivers-for-assign", agencyId],
      });
    },
    onError: (err: any) => {
      if (err?.status === 409 || err?.code === "MEMBERSHIP_ALREADY_PROCESSED") {
        setConflictMessage(
          "This membership has already been processed. Refresh to view the latest status."
        );
      } else {
        toast(formatApiErrorMessage(err), "error");
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reasonPayload: string) => {
      const targetMembershipId = resolvedMembershipId || membership?.id;
      if (!agencyId || !targetMembershipId) {
        throw new Error("Missing agency ID or membership ID for rejection.");
      }
      return membershipsApi.rejectMembership(agencyId, targetMembershipId, {
        reason: reasonPayload,
      });
    },
    onSuccess: () => {
      toast("Driver membership rejected", "info");
      setIsRejectOpen(false);
      setRejectReason("");
      if (agencyId && resolvedMembershipId) {
        queryClient.invalidateQueries({
          queryKey: ["agency-membership", agencyId, resolvedMembershipId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["agency-memberships", agencyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["agency-manage", agencyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["agency-pending-memberships", agencyId],
      });
      queryClient.invalidateQueries({
        queryKey: ["agency-approved-drivers-for-assign", agencyId],
      });
    },
    onError: (err: any) => {
      if (err?.status === 409 || err?.code === "MEMBERSHIP_ALREADY_PROCESSED") {
        setConflictMessage(
          "This membership has already been processed. Refresh to view the latest status."
        );
      } else {
        toast(formatApiErrorMessage(err), "error");
      }
    },
  });

  return (
    <div className="space-y-6">
      <TopNav
        title="Driver Application Review"
        subtitle={
          membership?.driver?.name
            ? `Reviewing fleet membership for ${membership.driver.name}`
            : resolvedMembershipId
            ? `Membership ID: ${resolvedMembershipId}`
            : "Review fleet membership application"
        }
      />

      <div className="px-6 space-y-6 max-w-5xl">
        <Link
          href="/dashboard/drivers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Drivers List
        </Link>

        {conflictMessage && (
          <Alert variant="warning" title="State Conflict Detected">
            {conflictMessage}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => { setConflictMessage(null); refetch(); }}>
                Refresh Latest Status
              </Button>
            </div>
          </Alert>
        )}

        {error && (
          <Alert variant="danger">
            {formatApiErrorMessage(error)}
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : !membership ? (
          <Card className="p-8 text-center">
            <User className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Driver membership record not found</p>
            <p className="text-xs text-slate-400 mt-1">
              No active or pending membership record was found for this identifier in your agency fleet.
            </p>
          </Card>
        ) : (
          <>
            {/* Domain Invariant Warning Alert */}
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
              <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-950 space-y-1">
                <span className="font-semibold block">Important Domain Invariant:</span>
                <p>
                  Approving a driver adds them to your agency fleet. However, drivers must also complete platform KYC verification before they can be assigned to vehicles.
                </p>
              </div>
            </div>

            {/* Driver Profile Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-base">
                    {driver?.name ? driver.name.slice(0, 2).toUpperCase() : "DR"}
                  </div>
                  <div>
                    <CardTitle>{driver?.name || "Driver Candidate"}</CardTitle>
                    <p className="text-xs text-slate-500">{driver?.email || "No email"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      driverStatus === "ONLINE" ? "success" : "neutral"
                    }
                  >
                    {driverStatus}
                  </Badge>
                  <Badge
                    variant={
                      membership.status === "ACTIVE" || membership.status === "APPROVED"
                        ? "success"
                        : membership.status === "REJECTED"
                        ? "danger"
                        : "warning"
                    }
                  >
                    Membership: {membership.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Operating Type
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {driver?.operatingType || "AGENCY"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Driving Experience
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {driver?.yearsOfExperience ?? 0} years
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    License Number (Masked)
                  </span>
                  <span className="text-sm font-mono text-slate-900">
                    {licenseNumber}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Platform KYC Status
                  </span>
                  <Badge
                    variant={
                      verificationStatus === "VERIFIED"
                        ? "success"
                        : verificationStatus === "REJECTED"
                        ? "danger"
                        : "warning"
                    }
                    size="sm"
                    className="mt-1"
                  >
                    {verificationStatus}
                  </Badge>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Application Date
                  </span>
                  <span className="text-sm text-slate-900">
                    {formatDateTime(membership.createdAt)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Decision Date
                  </span>
                  <span className="text-sm text-slate-900">
                    {membership.respondedAt ? formatDateTime(membership.respondedAt) : "Pending Review"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Membership ID
                  </span>
                  <span className="text-xs font-mono text-slate-900 break-all">
                    {membership.id}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Driver ID
                  </span>
                  <span className="text-xs font-mono text-slate-900 break-all">
                    {membership.driverId || driver?.id || "—"}
                  </span>
                </div>
              </CardContent>

              {membership.notes && (
                <div className="mx-6 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                  <span className="font-semibold block text-slate-900 mb-0.5">Approval Notes:</span>
                  {membership.notes}
                </div>
              )}

              {membership.rejectionReason && (
                <div className="mx-6 p-3.5 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-800">
                  <span className="font-semibold block text-rose-900 mb-0.5">Rejection Reason:</span>
                  {membership.rejectionReason}
                </div>
              )}

              {/* Action Buttons for Pending Driver */}
              {isPending && (
                <CardFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setIsRejectOpen(true)}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Reject Application
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsApproveOpen(true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Approve Driver
                  </Button>
                </CardFooter>
              )}
            </Card>
          </>
        )}
      </div>

      {/* Confirmation Dialog: Approve Driver */}
      <Dialog
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title="Approve Driver Membership"
        description="You are approving this driver's membership in your agency fleet."
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <span className="font-semibold block mb-0.5">Important:</span>
            This action admits the driver into your fleet. It does NOT automatically verify the driver at the platform KYC level.
          </div>

          <p className="text-xs text-slate-600">
            Once approved, the driver will be enrolled as an active member of your agency fleet. Note that vehicle assignments require independent platform verification.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApproveOpen(false)}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
            >
              Confirm Approval
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Rejection Dialog: Reject Driver */}
      <Dialog
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Reject Driver Application"
        description="Specify the reason for declining this driver's membership request."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Reason for Rejection *</label>
            <textarea
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              rows={3}
              placeholder="e.g. Incomplete background details or full agency fleet capacity"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(false)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={rejectMutation.isPending}
              disabled={!rejectReason.trim()}
              onClick={() => rejectMutation.mutate(rejectReason)}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
