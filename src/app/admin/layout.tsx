import React from "react";
import { AdminGuard } from "@/components/layout/AdminGuard";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row antialiased selection:bg-rose-500 selection:text-white">
        <AdminSidebar />
        <div className="flex-1 md:pl-64 flex flex-col min-h-screen bg-slate-900">
          <main className="flex-1 pb-16">
            <ErrorBoundary fallbackTitle="Admin Subsystem Error">
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
