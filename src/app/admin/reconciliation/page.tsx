"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settlementsApi } from "@/lib/api/settlements";
import { formatApiErrorMessage } from "@/lib/errors";
import { AdminTopNav } from "@/components/layout/AdminTopNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  FileCheck2,
  Wand2,
  CheckCircle2,
  Scale,
} from "lucide-react";

export default function AdminReconciliationAuditPage() {
  const queryClient = useQueryClient();
  const [isSweepModalOpen, setIsSweepModalOpen] = useState(false);
  const [sweepResult, setSweepResult] = useState<{
    staleLeasesReleased?: number;
    transfersSynchronized?: number;
  } | null>(null);
  const [sweepError, setSweepError] = useState<string | null>(null);

  // TanStack Query for 7-Point Reconciliation Audit
  const {
    data: auditResult,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "reconciliation", "audit"],
    queryFn: () => settlementsApi.getReconciliationAudit(),
  });

  // Reconciliation Sweep Mutation
  const sweepMutation = useMutation({
    mutationFn: () => settlementsApi.sweepReconciliation(),
    onSuccess: (data) => {
      setSweepResult({
        staleLeasesReleased: data.staleLeasesReleased ?? 0,
        transfersSynchronized: data.transfersSynchronized ?? 0,
      });
      setSweepError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "reconciliation", "audit"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] });
    },
    onError: (err: unknown) => {
      setSweepError(formatApiErrorMessage(err));
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "HIGH":
        return (
          <Badge variant="danger" size="sm" className="font-mono">
            HIGH
          </Badge>
        );
      case "MEDIUM":
        return (
          <Badge variant="warning" size="sm" className="font-mono">
            MEDIUM
          </Badge>
        );
      case "LOW":
      default:
        return (
          <Badge variant="info" size="sm" className="font-mono">
            LOW
          </Badge>
        );
    }
  };

  const discrepancies = auditResult?.discrepancies || [];
  const checkedCount = auditResult?.checkedCount ?? 0;
  const discrepanciesCount = auditResult?.discrepanciesCount ?? discrepancies.length;

  return (
    <div className="space-y-6">
      <AdminTopNav
        title="Reconciliation & Audit Console"
        subtitle="7-point financial invariant validation & worker lease reconciliation"
      />

      <div className="px-6 space-y-6 max-w-7xl mx-auto">
        {/* Sweep Action Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">Financial Integrity Audit</h2>
              <p className="text-xs text-slate-400">
                Authoritative 7-point cross-checks against double-entry ledger & provider records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin text-rose-400" : ""}`} />
              Refresh Audit
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSweepResult(null);
                setSweepError(null);
                setIsSweepModalOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs shadow-sm shadow-amber-900/40"
            >
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              Run Sweep
            </Button>
          </div>
        </div>

        {/* Audit Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-slate-950 border-slate-800 shadow-lg">
            <CardHeader className="pb-2">
              <span className="text-xs text-slate-400 font-medium">Checked Settlements</span>
              <CardTitle className="text-2xl font-bold font-mono text-slate-100">
                {isLoading ? <Skeleton className="h-8 w-24 bg-slate-900" /> : checkedCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-slate-500">Total records evaluated across all operators</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-950 border-slate-800 shadow-lg">
            <CardHeader className="pb-2">
              <span className="text-xs text-slate-400 font-medium">Detected Discrepancies</span>
              <CardTitle
                className={`text-2xl font-bold font-mono ${
                  discrepanciesCount > 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {isLoading ? <Skeleton className="h-8 w-24 bg-slate-900" /> : discrepanciesCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-slate-500">
                {discrepanciesCount > 0
                  ? "Action required: review discrepancy list below"
                  : "All financial invariants verified matched"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-950 border-slate-800 shadow-lg">
            <CardHeader className="pb-2">
              <span className="text-xs text-slate-400 font-medium">Integrity Status</span>
              <div className="pt-1">
                {isLoading ? (
                  <Skeleton className="h-6 w-28 bg-slate-900" />
                ) : discrepanciesCount === 0 ? (
                  <Badge variant="success" size="md" className="font-mono">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    INTEGRITY VERIFIED
                  </Badge>
                ) : (
                  <Badge variant="danger" size="md" className="font-mono">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    DISCREPANCIES DETECTED
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-slate-500">Double-entry ledger & provider transfer alignment</p>
            </CardContent>
          </Card>
        </div>

        {/* 7-Point Audit Invariants Reference */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
          <span className="font-bold text-slate-300 block">7 Backend Financial Invariants Evaluated:</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
            <div>1. Amount Mismatch: settlement vs payment gateway provider net</div>
            <div>2. Currency Mismatch: non-INR or mismatched currency code</div>
            <div>3. Stale Processing Lease: worker lease age &gt; 15 minutes</div>
            <div>4. Missing Payment Reference: settlement without linked ride payment</div>
            <div>5. Operator KYC Verification: payout account clearance status</div>
            <div>6. Missing Provider Reference: processed settlement without transfer ID</div>
            <div>7. Post-Settlement Refund: payment refund issued after payout dispatch</div>
          </div>
        </div>

        {/* Discrepancy Records Table */}
        <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-slate-800/80 px-6 py-4">
            <CardTitle className="text-slate-100 text-base">Discrepancy Audit Findings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full bg-slate-900" />
                <Skeleton className="h-10 w-full bg-slate-900" />
              </div>
            ) : error ? (
              <div className="p-6">
                <Alert variant="danger" title="Audit Query Failure">
                  {error instanceof Error ? error.message : "Error connecting to reconciliation service."}
                </Alert>
              </div>
            ) : discrepancies.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-emerald-500 opacity-60" />
                <p className="text-sm font-semibold text-slate-300">Clean Audit — Zero Discrepancies</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  All checked settlements strictly satisfy the 7 backend financial invariants and double-entry
                  ledger rules.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Settlement ID</th>
                      <th className="py-3 px-4 font-semibold">Violation Type</th>
                      <th className="py-3 px-4 font-semibold">Details</th>
                      <th className="py-3 px-4 font-semibold">Severity</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {discrepancies.map((item, idx) => (
                      <tr key={`${item.settlementId}-${idx}`} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                          {item.settlementId}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-amber-400 font-semibold">
                          {item.type}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 max-w-md">
                          {item.details}
                        </td>
                        <td className="py-3.5 px-4">
                          {getSeverityBadge(item.severity)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/admin/settlements/${item.settlementId}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white text-xs h-7 px-2.5"
                            >
                              Inspect
                              <ArrowRight className="h-3 w-3 ml-1 text-slate-400" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal: Reconciliation Sweep */}
      <Dialog
        isOpen={isSweepModalOpen}
        onClose={() => {
          if (!sweepMutation.isPending) {
            setIsSweepModalOpen(false);
          }
        }}
        title="Execute Reconciliation Sweep"
        description="Reclaim hung worker leases and query gateway status for stuck in-flight records"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p className="leading-relaxed">
            The automated sweep worker resets expired lease locks (&gt;15 minutes) to prevent deadlock
            and syncs pending transfer webhooks from Razorpay Route.
          </p>

          {sweepError && (
            <Alert variant="danger" title="Sweep Execution Failed">
              {sweepError}
            </Alert>
          )}

          {sweepResult && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1 font-mono">
              <p className="font-bold">Reconciliation Sweep Completed</p>
              <p>Stale Leases Released: {sweepResult.staleLeasesReleased ?? 0}</p>
              <p>Transfers Synchronized: {sweepResult.transfersSynchronized ?? 0}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={sweepMutation.isPending}
              onClick={() => setIsSweepModalOpen(false)}
            >
              {sweepResult ? "Close" : "Cancel"}
            </Button>
            {!sweepResult && (
              <Button
                variant="primary"
                size="sm"
                disabled={sweepMutation.isPending}
                onClick={() => sweepMutation.mutate()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {sweepMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Running Sweep...
                  </>
                ) : (
                  "Run Reconciliation Sweep"
                )}
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
