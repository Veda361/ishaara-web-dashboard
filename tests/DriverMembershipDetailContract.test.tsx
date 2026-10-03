import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DriverDetailPage from "@/app/dashboard/drivers/[id]/page";
import DriversPage from "@/app/dashboard/drivers/page";
import { membershipsApi } from "@/lib/api/memberships";
import { apiClient } from "@/lib/api/client";
import { ApiError, formatApiErrorMessage } from "@/lib/errors";
import * as AuthContextModule from "@/lib/auth/AuthContext";
import { AgencyMembership, PaginatedResult } from "@/types";

// Mock next/navigation
let mockParams = { id: "6ac0902cc639422a5e7ef184" };
const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
  }),
  usePathname: () => `/dashboard/drivers/${mockParams.id}`,
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("Driver Membership Detail Contract & ID Separation", () => {
  const agencyId = "6abfc5c876fbc787b93052d3";
  const driverId = "6ac0902cc639422a5e7ef184";
  const membershipId = "mem_6abfc5c8_real_membership_999";

  const mockMembershipRecord: AgencyMembership = {
    id: membershipId,
    agencyId,
    driverId,
    status: "PENDING",
    notes: "Eager for north campus fleet route",
    createdAt: "2026-10-01T10:00:00.000Z",
    driver: {
      id: driverId,
      userId: "usr_drv_456",
      name: "Ramesh Sharma",
      email: "ramesh@example.com",
      yearsOfExperience: 4,
      operatingType: "AGENCY",
      status: "ONLINE",
      verificationStatus: "VERIFIED",
      licenseNumber: "DL-1420110012345",
      phoneNumber: "+919876543210",
    },
  };

  const mockMembershipsList: PaginatedResult<AgencyMembership> = {
    items: [mockMembershipRecord],
    pagination: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockParams = { id: membershipId };

    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: {
        id: "usr_owner_1",
        email: "owner@agency.com",
        name: "Agency Owner",
        role: "AGENCY_OWNER",
      },
      isLoading: false,
      isAuthenticated: true,
      isAgencyOwner: true,
      isAdmin: false,
      ownedAgencies: [{ id: agencyId, name: "City Fleet Services", status: "ACTIVE", contactEmail: "owner@agency.com", createdAt: "2026-01-01" }],
      activeAgency: { id: agencyId, name: "City Fleet Services", status: "ACTIVE", contactEmail: "owner@agency.com", createdAt: "2026-01-01" },
      setActiveAgency: vi.fn(),
      refreshAgencies: vi.fn(),
      loginWithToken: vi.fn(),
      error: null,
      logout: vi.fn(),
    });
  });

  it("TASK 2 & 4: Drivers list links use real membership ID (mem.id) and not driverId", async () => {
    vi.spyOn(membershipsApi, "listMemberships").mockResolvedValue(mockMembershipsList);

    const Wrapper = createTestWrapper();
    render(<DriversPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getAllByText("Ramesh Sharma").length).toBeGreaterThan(0);
    });

    // Check desktop link
    const detailsButtons = screen.getAllByRole("button", { name: /Details|View Details & Review/i });
    expect(detailsButtons.length).toBeGreaterThan(0);

    const links = document.querySelectorAll(`a[href*="/dashboard/drivers/"]`);
    expect(links.length).toBeGreaterThan(0);

    links.forEach((link) => {
      const href = link.getAttribute("href");
      // Must link to membershipId, NEVER driverId
      expect(href).toBe(`/dashboard/drivers/${membershipId}`);
      expect(href).not.toBe(`/dashboard/drivers/${driverId}`);
    });
  });

  it("TASK 4, 9, 14: Given driverId != membershipId, when route receives membershipId, it requests membershipId and NEVER driverId", async () => {
    mockParams = { id: membershipId };

    const getMembershipSpy = vi
      .spyOn(membershipsApi, "getMembership")
      .mockResolvedValue(mockMembershipRecord);
    vi.spyOn(membershipsApi, "listMemberships").mockResolvedValue(mockMembershipsList);

    const Wrapper = createTestWrapper();
    render(<DriverDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Ramesh Sharma")).toBeDefined();
    });

    // Verify GET membership call was called with membershipId and NEVER driverId
    expect(getMembershipSpy).toHaveBeenCalledWith(agencyId, membershipId);
    expect(getMembershipSpy).not.toHaveBeenCalledWith(agencyId, driverId);

    // Verify identifiers displayed in UI
    expect(screen.getByText(membershipId)).toBeDefined();
    expect(screen.getByText(driverId)).toBeDefined();
  });

  it("TASK 4 & 9: When route receives legacy driverId (e.g. 6ac0902cc639422a5e7ef184), it resolves to real membershipId and requests membershipId, NEVER driverId", async () => {
    // Route parameter is driverId
    mockParams = { id: driverId };

    const getMembershipSpy = vi
      .spyOn(membershipsApi, "getMembership")
      .mockResolvedValue(mockMembershipRecord);
    vi.spyOn(membershipsApi, "listMemberships").mockResolvedValue(mockMembershipsList);

    const Wrapper = createTestWrapper();
    render(<DriverDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Ramesh Sharma")).toBeDefined();
    });

    // Verify URL was canonicalized to membershipId
    expect(mockReplace).toHaveBeenCalledWith(`/dashboard/drivers/${membershipId}`);

    // Verify getMembership was invoked with membershipId and NEVER driverId
    expect(getMembershipSpy).toHaveBeenCalledWith(agencyId, membershipId);
    expect(getMembershipSpy).not.toHaveBeenCalledWith(agencyId, driverId);
  });

  it("TASK 6: When driver has no membership in agency, does NOT call GET with driverId and shows clean empty state", async () => {
    const unknownDriverId = "6ac000000000000000000000";
    mockParams = { id: unknownDriverId };

    const getMembershipSpy = vi.spyOn(membershipsApi, "getMembership");
    vi.spyOn(membershipsApi, "listMemberships").mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });

    const Wrapper = createTestWrapper();
    render(<DriverDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Driver membership record not found")).toBeDefined();
    });

    // Crucial: getMembership was NOT called with the invalid driverId
    expect(getMembershipSpy).not.toHaveBeenCalled();
    // Generic backend 404 error should not be displayed
    expect(screen.queryByText("The requested resource could not be found.")).toBeNull();
  });

  it("TASK 7 & 10: Approve and reject actions strictly use membershipId, NEVER driverId", async () => {
    mockParams = { id: membershipId };

    vi.spyOn(membershipsApi, "getMembership").mockResolvedValue(mockMembershipRecord);
    vi.spyOn(membershipsApi, "listMemberships").mockResolvedValue(mockMembershipsList);
    const approveSpy = vi
      .spyOn(membershipsApi, "approveMembership")
      .mockResolvedValue({ ...mockMembershipRecord, status: "ACTIVE" });
    const rejectSpy = vi
      .spyOn(membershipsApi, "rejectMembership")
      .mockResolvedValue({ ...mockMembershipRecord, status: "REJECTED" });

    const Wrapper = createTestWrapper();
    render(<DriverDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Approve Driver/i })).toBeDefined();
    });

    // Test Approve Flow
    fireEvent.click(screen.getByRole("button", { name: /Approve Driver/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm Approval/i })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirm Approval/i }));

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith(agencyId, membershipId);
      expect(approveSpy).not.toHaveBeenCalledWith(
        agencyId,
        driverId
      );
    });

    // Test Reject Flow
    fireEvent.click(screen.getByRole("button", { name: /Reject Application/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e.g. Incomplete background details/i)).toBeDefined();
    });
    fireEvent.change(
      screen.getByPlaceholderText(/e.g. Incomplete background details/i),
      { target: { value: "Fleet capacity reached" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /Confirm Rejection/i }));

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith(
        agencyId,
        membershipId,
        { reason: "Fleet capacity reached" }
      );
      expect(rejectSpy).not.toHaveBeenCalledWith(
        agencyId,
        driverId,
        expect.anything()
      );
    });
  });

  it("TASK 2 & 6: membershipsApi.approveMembership sends NO request body to backend", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({
      success: true,
      data: { ...mockMembershipRecord, status: "ACTIVE" },
    });

    await membershipsApi.approveMembership(agencyId, membershipId);

    expect(postSpy).toHaveBeenCalledWith(
      `/api/v1/agencies/${encodeURIComponent(agencyId)}/memberships/${encodeURIComponent(membershipId)}/approve`
    );
    // Explicitly verify no body parameter was passed to apiClient.post
    expect(postSpy.mock.calls[0][1]).toBeUndefined();
  });

  it("TASK 4: Approval confirmation modal contains no notes input field", async () => {
    mockParams = { id: membershipId };
    vi.spyOn(membershipsApi, "getMembership").mockResolvedValue(mockMembershipRecord);
    vi.spyOn(membershipsApi, "listMemberships").mockResolvedValue(mockMembershipsList);

    const Wrapper = createTestWrapper();
    render(<DriverDetailPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Approve Driver/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /Approve Driver/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Confirm Approval/i })).toBeDefined();
    });

    // Verify notes textarea is completely removed from the approval modal
    expect(screen.queryByPlaceholderText(/e.g. Approved for Campus East route/i)).toBeNull();
    expect(screen.queryByText(/Optional Notes/i)).toBeNull();
    expect(screen.getByText(/You are approving this driver's membership in your agency fleet/i)).toBeDefined();
  });

  it("TASK 9: formatApiErrorMessage extracts detailed 400 validation messages", () => {
    const errorWithDetails = new ApiError(
      400,
      "VALIDATION_ERROR",
      "Request validation failed",
      [
        {
          field: "",
          message: "Approval does not accept body parameters",
        },
      ]
    );

    const message = formatApiErrorMessage(errorWithDetails);
    expect(message).toBe("Approval does not accept body parameters");
  });
});
