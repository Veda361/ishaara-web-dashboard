"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { AuthGuard } from "./AuthGuard";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8F9FC]">
        <Sidebar />
        <div className="md:pl-64 flex flex-col min-h-screen">
          <main className="flex-1 pb-16">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
