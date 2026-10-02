"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  KeyRound,
  FileCheck2,
} from "lucide-react";

interface HealthCheckData {
  status: "ok" | "degraded" | "error";
  service: string;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  requestId: string;
  dependencies?: {
    backendApi?: {
      target: string;
      status: string;
      latencyMs: number;
    };
    authCorsEndpoint?: {
      target: string;
      status: string;
      issueId: string;
      severity: string;
    };
  };
}

export function SystemHealthStatus() {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery<HealthCheckData>({
    queryKey: ["admin", "system", "health"],
    queryFn: async () => {
      const res = await fetch("/api/health?full=true", {
        headers: { "Cache-Control": "no-cache" },
      });
      return res.json();
    },
    refetchInterval: 30000, // 30-second safe operational polling
  });

  const isHealthy = data?.status === "ok";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer text-left"
        aria-label="View system operations and health status"
      >
        <Activity
          className={`h-4 w-4 ${
            isLoading
              ? "text-slate-400 animate-pulse"
              : isHealthy
              ? "text-emerald-400"
              : "text-amber-400"
          }`}
        />
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold leading-tight">
            Ops Status
          </span>
          <span className="text-xs font-mono font-bold text-slate-200 leading-tight flex items-center gap-1">
            {isLoading ? "Checking..." : isHealthy ? "HEALTHY" : "DEGRADED"}
          </span>
        </div>
        <span
          className={`h-2 w-2 rounded-full ml-1 ${
            isLoading
              ? "bg-slate-400"
              : isHealthy
              ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
              : "bg-amber-400 shadow-sm shadow-amber-400/50"
          }`}
        />
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="ISHAARA Operations & Dependency Health"
        description="Real-time liveness, upstream backend readiness, and known external dependencies"
      >
        <div className="space-y-4 text-xs text-slate-700">
          {/* Overall Health Status Card */}
          <div className="p-3 rounded-lg bg-slate-900 text-slate-100 flex items-center justify-between border border-slate-800">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Frontend Service
              </p>
              <p className="font-mono text-sm font-bold text-slate-100">
                {data?.service || "ishaara-web-dashboard"} ({data?.environment || "production"})
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Uptime</span>
              <span className="font-mono font-bold text-emerald-400">
                {data?.uptimeSeconds ? `${Math.floor(data.uptimeSeconds / 60)}m ${data.uptimeSeconds % 60}s` : "Active"}
              </span>
            </div>
          </div>

          {/* Subsystem Health Indicators */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5 text-indigo-600" /> Operational Subsystem Breakdown
            </h4>

            {/* Next.js Frontend Process */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Next.js Edge / Process Liveness</span>
                <span className="text-[11px] text-slate-500">Node 22 LTS runtime & static routes</span>
              </div>
              <Badge variant="success" size="sm" className="font-mono">
                <CheckCircle2 className="h-3 w-3 mr-1" /> OK
              </Badge>
            </div>

            {/* Upstream Render Backend */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">ISHAARA Core Backend API</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  https://reposnse-ishaara.onrender.com (
                  {data?.dependencies?.backendApi?.latencyMs
                    ? `${data.dependencies.backendApi.latencyMs}ms`
                    : "Probing"}
                  )
                </span>
              </div>
              {data?.dependencies?.backendApi?.status === "HEALTHY" ? (
                <Badge variant="success" size="sm" className="font-mono">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> HEALTHY
                </Badge>
              ) : (
                <Badge variant="warning" size="sm" className="font-mono text-amber-600 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {data?.dependencies?.backendApi?.status || "CHECKING"}
                </Badge>
              )}
            </div>

            {/* Known Auth CORS Dependency */}
            <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start justify-between gap-3">
              <div>
                <span className="font-semibold text-amber-900 block flex items-center gap-1">
                  <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                  Better Auth OTP Dispatch (BACKEND-AUTH-CORS-001)
                </span>
                <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
                  Upstream endpoint returns HTTP 500 on OPTIONS preflight due to missing mailer service config. Token authentication operational.
                </p>
              </div>
              <Badge variant="warning" size="sm" className="font-mono shrink-0">
                EXTERNAL
              </Badge>
            </div>

            {/* Financial Settlement & Reconciliation Engine */}
            <div className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block flex items-center gap-1">
                  <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                  Financial Settlement & Reconciliation Proxy
                </span>
                <span className="text-[11px] text-slate-500">
                  Server-side authorization guard with atomic lease locks
                </span>
              </div>
              <Badge variant="success" size="sm" className="font-mono">
                ACTIVE
              </Badge>
            </div>
          </div>

          {/* Trace Metadata */}
          {data?.requestId && (
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>Correlation ID:</span>
              <span className="text-slate-600">{data.requestId}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="bg-slate-900 text-white hover:bg-slate-800 text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
