"use client";

import React from "react";
import { Cpu } from "lucide-react";
import { SystemHealthStatus } from "@/components/admin/SystemHealthStatus";

export function AdminTopNav({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 backdrop-blur-md">
      <div>
        <h1 className="text-lg font-bold text-slate-100 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <SystemHealthStatus />

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <Cpu className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-mono font-semibold text-slate-300">AUTHORITATIVE ENGINE</span>
          <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
            PROTECTED
          </span>
        </div>
      </div>
    </header>
  );
}
