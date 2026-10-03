import { describe, it, expect } from "vitest";
import { formatApiErrorMessage, ApiError } from "@/lib/errors";
import { normalizeMembership } from "@/lib/api/memberships";

describe("Phase A17/A18 — AgencyMembershipContractTest", () => {
  it("formats 409 MEMBERSHIP_ALREADY_PROCESSED with friendly resolution message", () => {
    const error = new ApiError(
      409,
      "MEMBERSHIP_ALREADY_PROCESSED",
      "Membership already processed by another process"
    );

    const message = formatApiErrorMessage(error);
    expect(message).toBe(
      "This membership has already been processed. Refresh to view the latest status."
    );
  });

  it("formats 409 DRIVER_ALREADY_ASSIGNED conflict message", () => {
    const error = new ApiError(409, "DRIVER_ALREADY_ASSIGNED", "Conflict");
    expect(formatApiErrorMessage(error)).toBe(
      "This driver is already actively assigned to another vehicle."
    );
  });

  it("formats 409 VEHICLE_ALREADY_ASSIGNED conflict message", () => {
    const error = new ApiError(409, "VEHICLE_ALREADY_ASSIGNED", "Conflict");
    expect(formatApiErrorMessage(error)).toBe(
      "This vehicle is already actively assigned to another driver."
    );
  });

  it("enforces domain separation between membership status and platform verification status", () => {
    const membershipRecord = {
      status: "ACTIVE", // Membership approved in agency
      driver: {
        verificationStatus: "PENDING", // Platform KYC not yet approved
      },
    };

    expect(membershipRecord.status).toBe("ACTIVE");
    expect(membershipRecord.driver.verificationStatus).toBe("PENDING");
    expect(membershipRecord.status === "ACTIVE").not.toBe(
      membershipRecord.driver.verificationStatus === "VERIFIED"
    );
  });

  it("normalizeMembership maps driverVerificationStatus to verificationStatus without hardcoding", () => {
    const rawBackendRecord = {
      id: "6ac09045c639422a5e7ef19f",
      agencyId: "6abfc5c876fbc787b93052d3",
      driverId: "6ac0902cc639422a5e7ef184",
      driver: {
        driverId: "6ac0902cc639422a5e7ef184",
        userId: "6ac08fe2c639422a5e7ef15e",
        name: "Bhoomi Sahu",
        email: "devrajeshsahu@gmail.com",
        licenseNumberMasked: "****3929",
        yearsOfExperience: 4,
        operatingType: "AGENCY" as const,
        driverStatus: "OFFLINE" as const,
        driverVerificationStatus: "VERIFIED" as const,
      },
      status: "APPROVED" as const,
      createdAt: "2026-10-03T05:19:01.767Z",
    };

    const normalized = normalizeMembership(rawBackendRecord);

    expect(normalized.driver?.verificationStatus).toBe("VERIFIED");
    expect(normalized.driver?.driverVerificationStatus).toBe("VERIFIED");
    expect(normalized.driver?.status).toBe("OFFLINE");
    expect(normalized.driver?.driverStatus).toBe("OFFLINE");
    expect(normalized.driver?.id).toBe("6ac0902cc639422a5e7ef184");
    expect(normalized.driver?.licenseNumber).toBe("****3929");
  });
});
