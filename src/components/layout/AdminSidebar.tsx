"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";
import {
  Landmark,
  FileCheck2,
  LogOut,
  Menu,
  X,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";

const ADMIN_NAV_ITEMS = [
  { label: "Settlement Operations", href: "/admin/settlements", icon: Landmark },
  { label: "Reconciliation & Audit", href: "/admin/reconciliation", icon: FileCheck2 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout, isAgencyOwner } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navContent = (
    <div className="flex h-full flex-col justify-between p-4 bg-slate-950 text-slate-100 select-none border-r border-slate-800">
      <div className="space-y-6">
        {/* Admin Console Header */}
        <div className="flex items-center justify-between px-2 pt-2">
          <Link href="/admin/settlements" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center font-black text-lg text-white shadow-md shadow-rose-900/40">
              IS
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">
                ISHAARA
              </span>
              <span className="text-[10px] tracking-wider uppercase text-rose-400 font-bold block flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Admin Console
              </span>
            </div>
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Settlement Control
          </p>
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/admin/settlements" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-150",
                  isActive
                    ? "bg-rose-600 text-white shadow-sm shadow-rose-900/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                {item.label}
              </Link>
            );
          })}

          {isAgencyOwner && (
            <div className="pt-4 border-t border-slate-900 mt-4">
              <Link
                href="/dashboard"
                onClick={() => setIsMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Agency Dashboard
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Admin User Footer */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || "Administrator"}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
            ADMIN
          </span>
        </div>

        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Trigger */}
      <div className="md:hidden fixed top-3 left-4 z-40">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded-lg bg-slate-900 text-white shadow-md border border-slate-800"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-10">
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-30">
        {navContent}
      </aside>
    </>
  );
}
