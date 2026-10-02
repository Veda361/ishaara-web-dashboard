import { describe, it, expect } from "vitest";
import { formatMoneyMinor } from "@/lib/utils";

describe("Phase A18 — SettlementMoneyPrecisionTest", () => {
  it("formats zero paise correctly as ₹0.00", () => {
    expect(formatMoneyMinor(0)).toBe("₹0.00");
  });

  it("formats single-digit minor unit: 1 paise -> ₹0.01", () => {
    expect(formatMoneyMinor(1)).toBe("₹0.01");
  });

  it("formats ten minor units: 10 paise -> ₹0.10", () => {
    expect(formatMoneyMinor(10)).toBe("₹0.10");
  });

  it("formats ninety-nine minor units: 99 paise -> ₹0.99", () => {
    expect(formatMoneyMinor(99)).toBe("₹0.99");
  });

  it("formats exactly 1 Rupee: 100 paise -> ₹1.00", () => {
    expect(formatMoneyMinor(100)).toBe("₹1.00");
  });

  it("formats 101 paise -> ₹1.01", () => {
    expect(formatMoneyMinor(101)).toBe("₹1.01");
  });

  it("formats 999 paise -> ₹9.99", () => {
    expect(formatMoneyMinor(999)).toBe("₹9.99");
  });

  it("formats 1,000 paise -> ₹10.00", () => {
    expect(formatMoneyMinor(1000)).toBe("₹10.00");
  });

  it("formats 10,000 paise -> ₹100.00", () => {
    expect(formatMoneyMinor(10000)).toBe("₹100.00");
  });

  it("formats standard settlement amount: 4,050 paise -> ₹40.50", () => {
    expect(formatMoneyMinor(4050)).toBe("₹40.50");
  });

  it("formats large settlement amount: 45,000,000 paise -> ₹4,50,000.00", () => {
    expect(formatMoneyMinor(45000000)).toBe("₹4,50,000.00");
  });

  it("handles negative amounts safely without precision drift", () => {
    expect(formatMoneyMinor(-4050)).toBe("-₹40.50");
    expect(formatMoneyMinor(-1)).toBe("-₹0.01");
  });

  it("safely handles null, undefined, or NaN inputs", () => {
    expect(formatMoneyMinor(null)).toBe("—");
    expect(formatMoneyMinor(undefined)).toBe("—");
    expect(formatMoneyMinor(NaN)).toBe("—");
  });
});
