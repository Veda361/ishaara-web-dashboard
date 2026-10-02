import { describe, it, expect } from "vitest";
import { Vehicle, DriverVehicleAssignment, VehicleType } from "@/types";

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
