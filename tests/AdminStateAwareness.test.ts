import { describe, it, expect } from "vitest";
import { SettlementStatus } from "@/types";

describe("Phase A19 — AdminStateAwarenessTest", () => {
  interface ActionEligibility {
    canProcess: boolean;
    canRetry: boolean;
    canReconcile: boolean;
  }

  function getEligibleActions(status: SettlementStatus): ActionEligibility {
    switch (status) {
      case "PENDING":
        return { canProcess: true, canRetry: false, canReconcile: false };
      case "FAILED":
        return { canProcess: false, canRetry: true, canReconcile: true };
      case "PROCESSED":
        return { canProcess: false, canRetry: false, canReconcile: true };
      case "PROCESSING":
      case "NOT_READY":
      case "RECONCILING":
      default:
        return { canProcess: false, canRetry: false, canReconcile: false };
    }
  }

  it("permits Process only for PENDING settlements", () => {
    const actions = getEligibleActions("PENDING");
    expect(actions.canProcess).toBe(true);
    expect(actions.canRetry).toBe(false);
    expect(actions.canReconcile).toBe(false);
  });

  it("permits Retry and Reconcile for FAILED settlements, blocking Process", () => {
    const actions = getEligibleActions("FAILED");
    expect(actions.canProcess).toBe(false);
    expect(actions.canRetry).toBe(true);
    expect(actions.canReconcile).toBe(true);
  });

  it("permits Reconcile for PROCESSED settlements, blocking duplicate Process or Retry", () => {
    const actions = getEligibleActions("PROCESSED");
    expect(actions.canProcess).toBe(false);
    expect(actions.canRetry).toBe(false);
    expect(actions.canReconcile).toBe(true);
  });

  it("strictly locks all mutations when settlement is under active PROCESSING lease", () => {
    const actions = getEligibleActions("PROCESSING");
    expect(actions.canProcess).toBe(false);
    expect(actions.canRetry).toBe(false);
    expect(actions.canReconcile).toBe(false);
  });

  it("strictly locks all mutations when settlement is NOT_READY", () => {
    const actions = getEligibleActions("NOT_READY");
    expect(actions.canProcess).toBe(false);
    expect(actions.canRetry).toBe(false);
    expect(actions.canReconcile).toBe(false);
  });

  it("strictly locks all mutations when settlement is RECONCILING", () => {
    const actions = getEligibleActions("RECONCILING");
    expect(actions.canProcess).toBe(false);
    expect(actions.canRetry).toBe(false);
    expect(actions.canReconcile).toBe(false);
  });
});
