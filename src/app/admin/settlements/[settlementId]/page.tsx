"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settlementsApi } from "@/lib/api/settlements";
import { formatApiErrorMessage } from "@/lib/errors";
import { SettlementStatus } from "@/types";
import { AdminTopNav } from "@/components/layout/AdminTopNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { formatMoneyMinor, formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  RefreshCw,
  Building,
  CreditCard,
  FileCheck2,
  Lock,
} from "lucide-react";

export default function AdminSettlementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const settlementId = typeof params.settlementId === "string" ? params.settlementId : "";

  // Modals state
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isRetryModalOpen, setIsRetryModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [retryReason, setRetryReason] = useState("");
  const [retryReasonError, setRetryReasonError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Fetch Authoritative Settlement Record
  const {
    data: settlement,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "settlement", settlementId],
    queryFn: () => (settlementId ? settlementsApi.getSettlementDetail(settlementId) : null),
    enabled: !!settlementId,
  });

  // Process Mutation
  const processMutation = useMutation({
    mutationFn: () => settlementsApi.processSettlement(settlementId),
    onSuccess: (data) => {
      setActionSuccessMessage(
        `Settlement successfully transitioned to ${data.status}. Provider transfer: ${
          data.providerTransferId || "initiated"
        }`
      );
      setActionError(null);
      setIsProcessModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "settlement", settlementId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] });
    },
    onError: (err: unknown) => {
      setActionError(formatApiErrorMessage(err));
      setIsProcessModalOpen(false);
    },
  });

  // Retry Mutation
  const retryMutation = useMutation({
    mutationFn: (reason: string) => settlementsApi.retrySettlement(settlementId, reason),
    onSuccess: (data) => {
      setActionSuccessMessage(
        `Settlement re-queued successfully with status ${data.status}.`
      );
      setActionError(null);
      setIsRetryModalOpen(false);
      setRetryReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "settlement", settlementId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] });
    },
    onError: (err: unknown) => {
      setActionError(formatApiErrorMessage(err));
      setIsRetryModalOpen(false);
    },
  });

  // Reconcile Mutation
  const reconcileMutation = useMutation({
    mutationFn: () => settlementsApi.reconcileSettlement(settlementId),
    onSuccess: (data) => {
      setActionSuccessMessage(
        `Settlement reconciled: Status is ${data.status}, Reconciliation: ${data.reconciliationStatus}`
      );
      setActionError(null);
      setIsReconcileModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "settlement", settlementId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reconciliation"] });
    },
    onError: (err: unknown) => {
      setActionError(formatApiErrorMessage(err));
      setIsReconcileModalOpen(false);
    },
  });

  const handleRetrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retryReason || retryReason.trim().length < 3) {
      setRetryReasonError("A valid administrative reason (at least 3 characters) is required.");
      return;
    }
    setRetryReasonError(null);
    retryMutation.mutate(retryReason.trim());
  };

  const getStatusBadge = (status: SettlementStatus) => {
    switch (status) {
      case "PROCESSED":
        return (
          <Badge variant="success" size="md" className="font-mono">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            PROCESSED
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="warning" size="md" className="font-mono">
            <Clock className="h-4 w-4 mr-1.5" />
            PENDING
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="info" size="md" className="font-mono bg-blue-950 text-blue-300 border-blue-800">
            <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            PROCESSING (LEASE ACQUIRED)
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="danger" size="md" className="font-mono">
            <XCircle className="h-4 w-4 mr-1.5" />
            FAILED
          </Badge>
        );
      case "RECONCILING":
        return (
          <Badge variant="warning" size="md" className="font-mono border-amber-500/50 text-amber-400">
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            RECONCILING
          </Badge>
        );
      case "NOT_READY":
      default:
        return (
          <Badge variant="neutral" size="md" className="font-mono bg-slate-800 text-slate-400">
            NOT_READY
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AdminTopNav title="Settlement Record" subtitle="Loading administrative record..." />
        <div className="px-6 max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48 bg-slate-900" />
          <Skeleton className="h-64 w-full bg-slate-900" />
        </div>
      </div>
    );
  }

  if (error || !settlement) {
    return (
      <div className="space-y-6">
        <AdminTopNav title="Settlement Inspection" />
        <div className="px-6 max-w-5xl mx-auto space-y-4">
          <Link href="/admin/settlements">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Settlements
            </Button>
          </Link>
          <Alert variant="danger" title="Settlement Record Not Found">
            {error instanceof Error ? error.message : "Could not retrieve the requested settlement record."}
          </Alert>
        </div>
      </div>
    );
  }

  const isProcessAllowed = settlement.status === "PENDING";
  const isRetryAllowed = settlement.status === "FAILED";
  const isReconcileAllowed = settlement.status === "PROCESSED" || settlement.status === "FAILED";

  return (
    <div className="space-y-6">
      <AdminTopNav
        title={`Settlement ${settlement.id}`}
        subtitle="Platform-authoritative financial record & lifecycle mutations"
      />

      <div className="px-6 space-y-6 max-w-5xl mx-auto">
        {/* Navigation & Refresh */}
        <div className="flex items-center justify-between">
          <Link href="/admin/settlements">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Settlements
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin text-rose-400" : ""}`} />
            Refresh State
          </Button>
        </div>

        {/* Feedback alerts */}
        {actionSuccessMessage && (
          <Alert variant="success" title="Operation Succeeded">
            {actionSuccessMessage}
          </Alert>
        )}

        {actionError && (
          <Alert variant="danger" title="Administrative Mutation Blocked / Failed">
            {actionError}
          </Alert>
        )}

        {/* State-Aware Action Console Card */}
        <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-slate-800/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold block mb-1">
                State Machine Authority
              </span>
              <div className="flex items-center gap-3">
                <CardTitle className="text-slate-100 text-lg">Financial Lifecycle Actions</CardTitle>
                {getStatusBadge(settlement.status)}
              </div>
            </div>

            {/* Mutation Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Process Settlement */}
              {isProcessAllowed && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setActionError(null);
                    setActionSuccessMessage(null);
                    setIsProcessModalOpen(true);
                  }}
                  disabled={processMutation.isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-900/40"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Process Settlement
                </Button>
              )}

              {/* Retry Settlement */}
              {isRetryAllowed && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setActionError(null);
                    setActionSuccessMessage(null);
                    setIsRetryModalOpen(true);
                  }}
                  disabled={retryMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Retry Settlement
                </Button>
              )}

              {/* Reconcile Settlement */}
              {isReconcileAllowed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionError(null);
                    setActionSuccessMessage(null);
                    setIsReconcileModalOpen(true);
                  }}
                  disabled={reconcileMutation.isPending}
                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                >
                  <FileCheck2 className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                  Reconcile State
                </Button>
              )}

              {!isProcessAllowed && !isRetryAllowed && !isReconcileAllowed && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                  <span>No mutations permitted in {settlement.status} status</span>
                </div>
              )}
            </div>
          </CardHeader>

          {settlement.failedReason && (
            <div className="p-4 bg-rose-950/40 border-b border-rose-900/40 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Failure Reason (Gateway / Validation):</span>
                <span className="font-mono">{settlement.failedReason}</span>
              </div>
            </div>
          )}

          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Financial Ledger Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-rose-400" />
                Ledger & Amount Details
              </h3>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Authoritative Net Amount:</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {formatMoneyMinor(settlement.amountMinor, settlement.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Currency:</span>
                  <span className="font-mono text-slate-200">{settlement.currency}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Linked Payment ID:</span>
                  <span className="font-mono text-slate-200">{settlement.paymentId}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Payout Provider:</span>
                  <span className="font-mono text-slate-200">{settlement.provider || "RAZORPAY_ROUTE"}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Provider Transfer ID:</span>
                  <span className="font-mono text-slate-300">
                    {settlement.providerTransferId || "Pending Dispatch"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Payout Destination & Entity Refs */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-amber-400" />
                Beneficiary Banking Credentials
              </h3>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Account Holder:</span>
                  <span className="font-semibold text-slate-200">
                    {settlement.payoutAccountMasked?.accountHolderName || "Operator Primary Account"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Masked Account:</span>
                  <span className="font-mono text-slate-200">
                    {settlement.payoutAccountMasked?.bankAccountNumber || "****"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">IFSC Code:</span>
                  <span className="font-mono text-slate-200">
                    {settlement.payoutAccountMasked?.ifsc || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-slate-400">Operator ID:</span>
                  <span className="font-mono text-slate-300">{settlement.operatorId}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Driver ID:</span>
                  <span className="font-mono text-slate-300">{settlement.driverId}</span>
                </div>
              </div>
            </div>
          </CardContent>

          {/* Timestamps Footer */}
          <div className="px-6 py-3 bg-slate-900/40 border-t border-slate-800 flex flex-wrap gap-6 text-[11px] text-slate-400">
            <div>
              <span className="text-slate-500 mr-1.5">Created:</span>
              <span className="font-mono text-slate-300">{formatDateTime(settlement.createdAt)}</span>
            </div>
            {settlement.updatedAt && (
              <div>
                <span className="text-slate-500 mr-1.5">Updated:</span>
                <span className="font-mono text-slate-300">{formatDateTime(settlement.updatedAt)}</span>
              </div>
            )}
            {settlement.processedAt && (
              <div>
                <span className="text-slate-500 mr-1.5">Processed:</span>
                <span className="font-mono text-emerald-400">{formatDateTime(settlement.processedAt)}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500 mr-1.5">Reconciliation:</span>
              <span className="font-mono text-slate-300">{settlement.reconciliationStatus || "PENDING"}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Confirmation Modal: Process Settlement */}
      <Dialog
        isOpen={isProcessModalOpen}
        onClose={() => {
          if (!processMutation.isPending) {
            setIsProcessModalOpen(false);
          }
        }}
        title="Confirm Settlement Payout Dispatch"
        description="Verify financial transfer parameters prior to executing Razorpay Route mutation"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Settlement ID:</span>
              <span className="font-mono font-medium">{settlement.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment ID:</span>
              <span className="font-mono">{settlement.paymentId}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200">
              <span className="text-slate-500">Net Payout Amount:</span>
              <span className="font-mono font-bold text-sm text-slate-900">
                {formatMoneyMinor(settlement.amountMinor, settlement.currency)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Irrevocable Payout Transfer
            </p>
            <p>
              This action will acquire an atomic database lease and issue an external bank transfer to
              the verified beneficiary.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={processMutation.isPending}
              onClick={() => setIsProcessModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={processMutation.isPending}
              onClick={() => processMutation.mutate()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {processMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Processing Payout...
                </>
              ) : (
                "Process Settlement"
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirmation Modal: Retry Failed Settlement */}
      <Dialog
        isOpen={isRetryModalOpen}
        onClose={() => {
          if (!retryMutation.isPending) {
            setIsRetryModalOpen(false);
          }
        }}
        title="Retry Failed Settlement"
        description="Provide required administrative audit rationale to re-queue settlement"
      >
        <form onSubmit={handleRetrySubmit} className="space-y-4 text-xs text-slate-700">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Settlement ID:</span>
              <span className="font-mono font-medium">{settlement.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatMoneyMinor(settlement.amountMinor, settlement.currency)}
              </span>
            </div>
            {settlement.failedReason && (
              <div className="text-rose-600 pt-1">
                <span className="font-semibold">Last Error: </span>
                <span className="font-mono">{settlement.failedReason}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="retry-reason" className="block font-semibold text-slate-800">
              Administrative Retry Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="retry-reason"
              rows={3}
              value={retryReason}
              onChange={(e) => {
                setRetryReason(e.target.value);
                if (retryReasonError) setRetryReasonError(null);
              }}
              placeholder="e.g. Beneficiary bank verified operational after technical downtime"
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              disabled={retryMutation.isPending}
            />
            {retryReasonError && (
              <p className="text-[11px] text-rose-600">{retryReasonError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={retryMutation.isPending}
              onClick={() => setIsRetryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={retryMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {retryMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Submitting Retry...
                </>
              ) : (
                "Retry Settlement"
              )}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirmation Modal: Reconcile Settlement */}
      <Dialog
        isOpen={isReconcileModalOpen}
        onClose={() => {
          if (!reconcileMutation.isPending) {
            setIsReconcileModalOpen(false);
          }
        }}
        title="Reconcile Settlement with Payment Gateway"
        description="Verify external transfer status against payment provider records"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p className="leading-relaxed">
            Reconciliation queries the payment gateway provider API to ensure transaction state,
            clearing status, and ledger entries match platform records. If discrepancies exist,
            the backend will synchronize the state.
          </p>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 font-mono text-[11px]">
            <div>Settlement: {settlement.id}</div>
            <div>Current Status: {settlement.status}</div>
            <div>Reconciliation Status: {settlement.reconciliationStatus || "UNRECONCILED"}</div>
            <div>Provider Transfer: {settlement.providerTransferId || "None"}</div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={reconcileMutation.isPending}
              onClick={() => setIsReconcileModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={reconcileMutation.isPending}
              onClick={() => reconcileMutation.mutate()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {reconcileMutation.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Reconciling Gateway State...
                </>
              ) : (
                "Reconcile Settlement"
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
