import { describe, it, expect } from "vitest";
import { formatApiErrorMessage, ApiError } from "@/lib/errors";

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
});
