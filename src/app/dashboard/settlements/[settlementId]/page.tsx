"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { settlementsApi } from "@/lib/api/settlements";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoneyMinor, formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Receipt,
  Building,
  CreditCard,
} from "lucide-react";

export default function SettlementDetailPage() {
  const params = useParams();
  const settlementId = typeof params.settlementId === "string" ? params.settlementId : "";

  const {
    data: settlement,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["settlement-detail", settlementId],
    queryFn: () => (settlementId ? settlementsApi.getSettlementDetail(settlementId) : null),
    enabled: !!settlementId,
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PROCESSED":
        return <Badge variant="success">Processed</Badge>;
      case "PENDING":
        return <Badge variant="warning">Pending Payout</Badge>;
      case "PROCESSING":
        return <Badge variant="info">In Processing</Badge>;
      case "RECONCILING":
        return <Badge variant="warning">Reconciling</Badge>;
      case "FAILED":
        return <Badge variant="danger">Failed</Badge>;
      case "NOT_READY":
      default:
        return <Badge variant="neutral">{status || "UNKNOWN"}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <TopNav
        title="Settlement Record Details"
        subtitle={`Audit inspection for settlement ID: ${settlementId}`}
      />

      <div className="px-6 space-y-6 max-w-4xl">
        <Link
          href="/dashboard/settlements"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settlements
        </Link>

        {error && (
          <Alert variant="danger" title="Unable to retrieve settlement record">
            The requested settlement could not be loaded from the authoritative provider or requires administrative privileges.
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : !settlement ? (
          <Card className="p-8 text-center">
            <Landmark className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Settlement record not found</p>
          </Card>
        ) : (
          <>
            {/* Header Summary Card */}
            <Card className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Authoritative Settlement Amount
                  </span>
                  <div className="text-3xl font-bold font-mono text-emerald-400">
                    {formatMoneyMinor(settlement.amountMinor, settlement.currency)}
                  </div>
                  <p className="text-xs text-slate-300">
                    Currency: {settlement.currency} • Minor Units: {settlement.amountMinor} paise
                  </p>
                </div>
                <div className="space-y-1 sm:text-right">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Settlement Status
                  </span>
                  <div>{getStatusBadge(settlement.status)}</div>
                </div>
              </div>
            </Card>

            {/* Financial Metadata Grid */}
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base">Ledger & Transaction Identifiers</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Settlement ID
                  </span>
                  <span className="font-mono text-slate-900 font-semibold">{settlement.id}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Payment Order Reference
                  </span>
                  <span className="font-mono text-slate-900 font-semibold">{settlement.paymentId}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Operator ID
                  </span>
                  <span className="font-mono text-slate-900">{settlement.operatorId}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Driver ID
                  </span>
                  <span className="font-mono text-slate-900">{settlement.driverId}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Payment Provider
                  </span>
                  <span className="font-semibold text-slate-900">{settlement.provider || "RAZORPAY"}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Gateway Transfer Reference
                  </span>
                  <span className="font-mono text-slate-900">
                    {settlement.providerTransferId || "Pending Gateway Execution"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Creation Timestamp
                  </span>
                  <span className="text-slate-800">{formatDateTime(settlement.createdAt)}</span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Processed Timestamp
                  </span>
                  <span className="text-slate-800">
                    {settlement.processedAt ? formatDateTime(settlement.processedAt) : "Not Processed"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Payout Banking Information (Masked) */}
            {settlement.payoutAccountMasked && (
              <Card>
                <CardHeader className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-slate-500" />
                    <CardTitle className="text-base">Payout Bank Account (Masked)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Account Holder
                    </span>
                    <span className="font-semibold text-slate-900">
                      {settlement.payoutAccountMasked.accountHolderName || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Account Number
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {settlement.payoutAccountMasked.bankAccountNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      IFSC Code
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {settlement.payoutAccountMasked.ifsc}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
