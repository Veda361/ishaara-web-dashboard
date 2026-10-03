"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthContext";
import { membershipsApi } from "@/lib/api/memberships";
import { TopNav } from "@/components/layout/TopNav";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/utils";
import { formatApiErrorMessage } from "@/lib/errors";
import { Users, ChevronLeft, ChevronRight, Eye, Search, RefreshCw } from "lucide-react";

export default function DriversPage() {
  const { activeAgency } = useAuth();
  const agencyId = activeAgency?.id;

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const {
    data: membershipData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["agency-memberships", agencyId, statusFilter, page],
    queryFn: () =>
      agencyId
        ? membershipsApi.listMemberships(agencyId, {
            status: statusFilter === "ALL" ? undefined : statusFilter,
            page,
            limit: 10,
          })
        : null,
    enabled: !!agencyId,
    retry: (failureCount, err) => {
      // Bounded retry for transient infrastructure/network errors (up to 2 retries)
      if (failureCount >= 2) return false;
      const status = (err as { status?: number })?.status;
      // Do not retry 4xx errors
      if (status && status >= 400 && status < 500) return false;
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
  });

  const items = membershipData?.items || [];
  const pagination = membershipData?.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // Filter client-side by search query if user searches names
  const filteredItems = searchTerm.trim()
    ? items.filter(
        (m) =>
          m.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.driver?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-6">
      <TopNav
        title="Fleet Drivers"
        subtitle="Manage driver memberships, applications, and operating verification"
      />

      <div className="px-6 space-y-4">
        {/* Tab Controls and Search */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setStatusFilter(tab);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === tab
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab === "ALL" ? "All Drivers" : tab}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Search driver by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs py-2"
            />
          </div>
        </div>

        {/* State A: Explicit Error State (do NOT show empty state or table when request failed) */}
        {error ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 shadow-xs space-y-4">
            <Alert variant="danger" className="text-left">
              {formatApiErrorMessage(error)}
            </Alert>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                <span>{isFetching ? "Retrying..." : "Retry Request"}</span>
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          /* State B: Loading Skeleton */
          <TableSkeleton rows={5} cols={7} />
        ) : filteredItems.length === 0 ? (
          /* State C: Genuine Empty State (only when API succeeds and returned empty list) */
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <h4 className="text-sm font-semibold text-slate-700">No driver records found</h4>
            <p className="text-xs text-slate-400">
              {statusFilter === "PENDING"
                ? "No driver applications are waiting for review."
                : "No drivers match the current filters for your agency fleet."}
            </p>
          </div>
        ) : (
          /* State D: Data Table View */
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Operating Type</TableHead>
                    <TableHead>Driver Status</TableHead>
                    <TableHead>Platform Verification</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Applied At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((mem) => {
                    const driver = mem.driver;
                    return (
                      <TableRow key={mem.id}>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-900">{driver?.name || "Driver Candidate"}</p>
                            <p className="text-xs text-slate-400">{driver?.email || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{driver?.yearsOfExperience ?? 0} yrs</TableCell>
                        <TableCell>
                          <Badge variant="neutral" size="sm">
                            {driver?.operatingType || "AGENCY"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={driver?.status === "ONLINE" ? "success" : "neutral"}
                            size="sm"
                          >
                            {driver?.status || "OFFLINE"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              driver?.verificationStatus === "VERIFIED"
                                ? "success"
                                : driver?.verificationStatus === "REJECTED"
                                ? "danger"
                                : "warning"
                            }
                            size="sm"
                          >
                            {driver?.verificationStatus || "PENDING"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              mem.status === "ACTIVE" || mem.status === "APPROVED"
                                ? "success"
                                : mem.status === "REJECTED"
                                ? "danger"
                                : "warning"
                            }
                            size="sm"
                          >
                            {mem.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {formatDateTime(mem.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/drivers/${mem.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-3">
              {filteredItems.map((mem) => {
                const driver = mem.driver;
                return (
                  <div
                    key={mem.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{driver?.name || "Driver Candidate"}</h4>
                        <p className="text-xs text-slate-400">{driver?.email || "—"}</p>
                      </div>
                      <Badge
                        variant={
                          mem.status === "ACTIVE" || mem.status === "APPROVED"
                            ? "success"
                            : mem.status === "REJECTED"
                            ? "danger"
                            : "warning"
                        }
                        size="sm"
                      >
                        {mem.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Platform KYC</span>
                        <span className="font-medium">{driver?.verificationStatus || "PENDING"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Experience</span>
                        <span className="font-medium">{driver?.yearsOfExperience || 0} years</span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Link href={`/dashboard/drivers/${mem.id}`} className="w-full">
                        <Button size="sm" variant="outline" className="w-full">
                          View Details & Review
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
