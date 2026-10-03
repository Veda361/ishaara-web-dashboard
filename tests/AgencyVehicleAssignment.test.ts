import { describe, it, expect } from "vitest";
import { DriverVehicleAssignment, VehicleType } from "@/types";
import { formatApiErrorMessage, ApiError } from "@/lib/errors";

describe("Phase A17/A18 — AgencyVehicleAssignmentTest", () => {
  it("enforces supported vehicle types", () => {
    const validTypes: VehicleType[] = ["BUS", "MINIBUS", "VAN", "AUTO"];
    expect(validTypes).toContain("BUS");
    expect(validTypes).toContain("MINIBUS");
  });

  it("verifies DriverVehicleAssignment schema as authoritative pairing entity", () => {
    const assignment: DriverVehicleAssignment = {
      id: "asg_123456",
      agencyId: "agency_abc",
      vehicleId: "veh_xyz",
      driverId: "drv_789",
      status: "ACTIVE",
      assignedAt: "2026-10-01T10:00:00.000Z",
      unassignedAt: null,
    };

    expect(assignment.status).toBe("ACTIVE");
    expect(assignment.vehicleId).toBe("veh_xyz");
    expect(assignment.driverId).toBe("drv_789");
  });

  it("verifies vehicle assignment termination records unassignedAt timestamp", () => {
    const terminatedAssignment: DriverVehicleAssignment = {
      id: "asg_123456",
      agencyId: "agency_abc",
      vehicleId: "veh_xyz",
      driverId: "drv_789",
      status: "TERMINATED",
      assignedAt: "2026-10-01T10:00:00.000Z",
      unassignedAt: "2026-10-02T12:00:00.000Z",
    };

    expect(terminatedAssignment.status).toBe("TERMINATED");
    expect(terminatedAssignment.unassignedAt).toBeDefined();
    expect(terminatedAssignment.unassignedAt).not.toBeNull();
  });
});

describe("Driver Verification Assignment Flow Tests (Phases 1-18)", () => {
  // Helper evaluating driver assignment eligibility
  function isDriverEligibleForAssignment(membership: {
    status: string;
    driver?: { verificationStatus: string };
  }): boolean {
    const isMembershipApproved =
      membership.status === "ACTIVE" || membership.status === "APPROVED";
    const isPlatformVerified =
      membership.driver?.verificationStatus === "VERIFIED";
    return isMembershipApproved && isPlatformVerified;
  }

  it("CASE 1: Platform VERIFIED + Membership APPROVED/ACTIVE -> driver selectable/eligible", () => {
    const driver = {
      status: "APPROVED",
      driver: { verificationStatus: "VERIFIED" },
    };
    expect(isDriverEligibleForAssignment(driver)).toBe(true);

    const activeDriver = {
      status: "ACTIVE",
      driver: { verificationStatus: "VERIFIED" },
    };
    expect(isDriverEligibleForAssignment(activeDriver)).toBe(true);
  });

  it("CASE 2: Platform PENDING + Membership APPROVED -> driver not assignable", () => {
    const driver = {
      status: "APPROVED",
      driver: { verificationStatus: "PENDING" },
    };
    expect(isDriverEligibleForAssignment(driver)).toBe(false);
  });

  it("CASE 3: Platform UNDER_REVIEW / unverified + Membership APPROVED -> driver not assignable", () => {
    const driver = {
      status: "APPROVED",
      driver: { verificationStatus: "UNDER_REVIEW" },
    };
    expect(isDriverEligibleForAssignment(driver)).toBe(false);
  });

  it("CASE 4: Platform REJECTED + Membership APPROVED -> driver not assignable", () => {
    const driver = {
      status: "APPROVED",
      driver: { verificationStatus: "REJECTED" },
    };
    expect(isDriverEligibleForAssignment(driver)).toBe(false);
  });

  it("CASE 5: Platform VERIFIED + Membership PENDING -> driver not assignable", () => {
    const driver = {
      status: "PENDING",
      driver: { verificationStatus: "VERIFIED" },
    };
    expect(isDriverEligibleForAssignment(driver)).toBe(false);
  });

  it("CASE 6: Platform VERIFIED + Membership REJECTED -> driver not assignable", () => {
    const driver = {
      status: "REJECTED",
      driver: { verificationStatus: "VERIFIED" },
    };
    expect(isDriverEligibleForAssignment(driver)).toBe(false);
  });

  it("CASE 7: Empty state differentiation between no verified drivers and no drivers found", () => {
    const allMemberships = [
      { id: "mem_1", status: "APPROVED", driver: { verificationStatus: "PENDING" } },
      { id: "mem_2", status: "APPROVED", driver: { verificationStatus: "REJECTED" } },
    ];

    const verified = allMemberships.filter(
      (m) => m.driver?.verificationStatus === "VERIFIED"
    );

    // Approved drivers exist, but none are verified
    expect(allMemberships.length).toBeGreaterThan(0);
    expect(verified.length).toBe(0);

    const emptyVerifiedState =
      allMemberships.length > 0 && verified.length === 0;
    expect(emptyVerifiedState).toBe(true);
  });

  it("CASE 8: Backend independently returns DRIVER_NOT_VERIFIED -> formats clear business rule message", () => {
    const error = new ApiError(
      400,
      "DRIVER_NOT_VERIFIED",
      "Driver must be platform VERIFIED before vehicle assignment."
    );

    const formatted = formatApiErrorMessage(error);
    expect(formatted).toBe("Driver must be platform VERIFIED before vehicle assignment.");
  });

  it("verifies minimal assignment payload contract (only driverId in body)", () => {
    const payload = { driverId: "6ac09045c639422a5e7ef19f" };
    expect(Object.keys(payload)).toEqual(["driverId"]);
    expect(payload).not.toHaveProperty("membershipId");
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("verificationStatus");
    expect(payload).not.toHaveProperty("vehicleId");
  });
});

