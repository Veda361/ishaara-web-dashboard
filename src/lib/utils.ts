import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  if (phone.length <= 4) return phone;
  return `******${phone.slice(-4)}`;
}

/**
 * Format integer minor units (paise) into authoritative currency string.
 * Example: 4500 paise -> ₹45.00
 * Handles negative, zero, and boundary minor units with integer-safe arithmetic.
 */
export function formatMoneyMinor(amountMinor?: number | null, currency: string = "INR"): string {
  if (amountMinor === undefined || amountMinor === null || isNaN(amountMinor)) {
    return "—";
  }

  const isNegative = amountMinor < 0;
  const absPaise = Math.abs(Math.round(amountMinor));
  const major = Math.floor(absPaise / 100);
  const minor = absPaise % 100;

  const formattedMajor = new Intl.NumberFormat("en-IN").format(major);
  const formattedMinor = minor.toString().padStart(2, "0");

  const sign = isNegative ? "-" : "";
  const symbol = currency === "INR" ? "₹" : `${currency} `;

  return `${sign}${symbol}${formattedMajor}.${formattedMinor}`;
}
