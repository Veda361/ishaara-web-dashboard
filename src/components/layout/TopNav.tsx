"use client";

import React from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Building2, ShieldCheck } from "lucide-react";

export function TopNav({ title, subtitle }: { title: string; subtitle?: string }) {
  const { activeAgency } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-md">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {activeAgency && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-800">{activeAgency.name}</span>
            <Badge variant="success" size="sm">
              <ShieldCheck className="h-3 w-3 mr-0.5" />
              Verified Fleet
            </Badge>
          </div>
        )}
      </div>
    </header>
  );
}
