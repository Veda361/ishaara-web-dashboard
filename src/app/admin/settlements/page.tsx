"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settlementsApi } from "@/lib/api/settlements";
import { formatApiErrorMessage } from "@/lib/errors";
import { SettlementRecord, SettlementStatus } from "@/types";
import { AdminTopNav } from "@/components/layout/AdminTopNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { formatMoneyMinor, formatDateTime } from "@/lib/utils";
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Layers,
  Wand2,
} from "lucide-react";

export default function AdminSettlementsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSweepModalOpen, setIsSweepModalOpen] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    processed: number;
    succeeded: number;
    failed: number;
  } | null>(null);
  const [sweepResult, setSweepResult] = useState<{
    staleLeasesReleased?: number;
    transfersSynchronized?: number;
  } | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);

  // TanStack Query for Platform Settlements
  const {
    data: settlementsResult,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "settlements", { page: currentPage, status: statusFilter, limit: 15 }],
    queryFn: () =>
      settlementsApi.listPlatformSettlements({
        page: currentPage,
        limit: 15,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      }),
  });

  // Batch Process Mutation
  const batchMutation = useMutation({
    mutationFn: () => settlementsApi.processBatchSettlements(),
    onSuccess: (data) => {
      setBatchResult({
        processed: data.processed,
        succeeded: data.succeeded,
        failed: data.failed,
      });
      setOperationError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] });
    },
    onError: (err: unknown) => {
      setOperationError(formatApiErrorMessage(err));
    },
  });

  // Reconciliation Sweep Mutation
  const sweepMutation = useMutation({
    mutationFn: () => settlementsApi.sweepReconciliation(),
    onSuccess: (data) => {
      setSweepResult({
        staleLeasesReleased: data.staleLeasesReleased ?? 0,
        transfersSynchronized: data.transfersSynchronized ?? 0,
      });
      setOperationError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reconciliation"] });
    },
    onError: (err: unknown) => {
      setOperationError(formatApiErrorMessage(err));
    },
  });

  const getStatusBadge = (status: SettlementStatus) => {
    switch (status) {
      case "PROCESSED":
        return (
          <Badge variant="success" size="sm" className="font-mono">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            PROCESSED
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="warning" size="sm" className="font-mono">
            <Clock className="h-3 w-3 mr-1" />
            PENDING
          </Badge>
        );
      case "PROCESSING":
        return (
          <Badge variant="info" size="sm" className="font-mono bg-blue-950 text-blue-300 border-blue-800">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            PROCESSING
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="danger" size="sm" className="font-mono">
            <XCircle className="h-3 w-3 mr-1" />
            FAILED
          </Badge>
        );
      case "RECONCILING":
        return (
          <Badge variant="warning" size="sm" className="font-mono border-amber-500/50 text-amber-400">
            <AlertTriangle className="h-3 w-3 mr-1" />
            RECONCILING
          </Badge>
        );
      case "NOT_READY":
      default:
        return (
          <Badge variant="neutral" size="sm" className="font-mono bg-slate-800 text-slate-400">
            NOT_READY
          </Badge>
        );
    }
  };

  const settlements = settlementsResult?.items || [];
  const pagination = settlementsResult?.pagination;

  return (
    <div className="space-y-6">
      <AdminTopNav
        title="Settlement Control Center"
        subtitle="Platform-wide financial payout dispatch, batch processing & state management"
      />

      <div className="px-6 space-y-6 max-w-7xl mx-auto">
        {/* Error notification */}
        {operationError && (
          <Alert variant="danger" title="Administrative Operation Failure">
            {operationError}
          </Alert>
        )}

        {/* Global Batch & Sweep Action Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/40 text-rose-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">Administrative Financial Operations</h2>
              <p className="text-xs text-slate-400">
                Trigger high-concurrency batch sweeps or clear hung worker leases across the network
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSweepResult(null);
                setOperationError(null);
                setIsSweepModalOpen(true);
              }}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <Wand2 className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
              Reconciliation Sweep
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setBatchResult(null);
                setOperationError(null);
                setIsBatchModalOpen(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-900/40"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Batch Process Settlements
            </Button>
          </div>
        </div>

        {/* Status Filter & Refresh Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "PENDING", "PROCESSING", "PROCESSED", "FAILED", "NOT_READY", "RECONCILING"].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {st}
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin text-rose-400" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Settlements Table Card */}
        <Card className="bg-slate-950 border-slate-800 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-slate-800/80 px-6 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-slate-100 text-base">Platform Settlements</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Showing {settlements.length} of {pagination?.total ?? 0} records
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full bg-slate-900" />
                <Skeleton className="h-10 w-full bg-slate-900" />
                <Skeleton className="h-10 w-full bg-slate-900" />
              </div>
            ) : error ? (
              <div className="p-6">
                <Alert variant="danger" title="Failed to retrieve platform settlements">
                  {error instanceof Error ? error.message : "Error connecting to settlement controller."}
                </Alert>
              </div>
            ) : settlements.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Landmark className="h-12 w-12 mx-auto mb-3 opacity-30 text-slate-400" />
                <p className="text-sm font-semibold text-slate-400">No Settlements Found</p>
                <p className="text-xs text-slate-500 mt-1">
                  No settlement records match status filter &quot;{statusFilter}&quot;.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Settlement ID</th>
                      <th className="py-3 px-4 font-semibold">Payment ID</th>
                      <th className="py-3 px-4 font-semibold">Operator / Driver</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Reconciliation</th>
                      <th className="py-3 px-4 font-semibold">Created</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {settlements.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                          {record.id}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {record.paymentId}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <div className="text-[11px] font-mono text-slate-400">
                            Op: {record.operatorId.slice(0, 8)}...
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            Drv: {record.driverId.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-100 font-mono">
                          {formatMoneyMinor(record.amountMinor, record.currency)}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] text-slate-400">
                            {record.reconciliationStatus || "UNRECONCILED"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {formatDateTime(record.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/admin/settlements/${record.id}`}>
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

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1 || isFetching}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="border-slate-800 bg-slate-900 text-slate-300"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= pagination.totalPages || isFetching}
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    className="border-slate-800 bg-slate-900 text-slate-300"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal: Batch Process Settlements */}
      <Dialog
        isOpen={isBatchModalOpen}
        onClose={() => {
          if (!batchMutation.isPending) {
            setIsBatchModalOpen(false);
          }
        }}
        title="Execute Batch Settlement Dispatch"
        description="Trigger platform sweep to atomically lease and process all eligible PENDING settlements"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              High-Impact Financial Mutation
            </p>
            <p className="leading-relaxed">
              This triggers the backend batch worker to acquire distributed locks on all unleased
              PENDING settlements and issue bank transfers via Razorpay Route.
            </p>
          </div>

          {batchResult && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1 font-mono">
              <p className="font-bold">Batch Sweep Completed Successfully</p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <span className="text-slate-500 block text-[10px]">Processed</span>
                  <span className="text-base font-bold text-slate-900">{batchResult.processed}</span>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <span className="text-slate-500 block text-[10px]">Succeeded</span>
                  <span className="text-base font-bold text-emerald-600">{batchResult.succeeded}</span>
                </div>
                <div className="bg-white p-2 rounded border border-emerald-200">
                  <span className="text-slate-500 block text-[10px]">Failed</span>
                  <span className="text-base font-bold text-rose-600">{batchResult.failed}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={batchMutation.isPending}
              onClick={() => setIsBatchModalOpen(false)}
            >
              {batchResult ? "Close" : "Cancel"}
            </Button>
            {!batchResult && (
              <Button
                variant="primary"
                size="sm"
                disabled={batchMutation.isPending}
                onClick={() => batchMutation.mutate()}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {batchMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Executing Batch Dispatch...
                  </>
                ) : (
                  "Execute Batch Process"
                )}
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      {/* Confirmation Modal: Reconciliation Sweep */}
      <Dialog
        isOpen={isSweepModalOpen}
        onClose={() => {
          if (!sweepMutation.isPending) {
            setIsSweepModalOpen(false);
          }
        }}
        title="Execute Reconciliation Sweep"
        description="Reclaim hung leases (>15 min) and synchronize pending transfer states with provider"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <p className="leading-relaxed">
            The automated reconciliation sweep scans the platform database for worker locks held
            longer than 15 minutes without status transition and queries Razorpay Route to resolve
            in-flight or lost webhook notifications.
          </p>

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
