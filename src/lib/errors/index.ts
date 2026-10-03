export class ApiError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function sanitizeMessage(msg?: string): string {
  if (!msg || typeof msg !== "string") return "An unexpected error occurred.";
  const sensitivePatterns = [
    /admin_secret_key/i,
    /x-admin-key/i,
    /authorization/i,
    /bearer\s+/i,
    /cookie/i,
    /password/i,
    /secret/i,
    /token/i,
    /postgres/i,
    /mysql/i,
    /database/i,
    /econnrefused/i,
    /10\.\d+\.\d+\.\d+/,
    /192\.168\.\d+\.\d+/,
    /172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/,
    /https?:\/\//i,
    /at\s+[\w.<>]+\s+\(/i,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(msg)) {
      return "A technical error occurred while communicating with the service. Please try again.";
    }
  }

  return msg;
}

export function formatApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "Session expired or authentication required. Please sign in.";
    }
    if (error.status === 403) {
      return "You do not have permission to perform this action.";
    }
    if (error.status === 400) {
      if (Array.isArray(error.details) && error.details.length > 0) {
        const detailMsgs = error.details
          .map((d: unknown) => {
            if (typeof d === "object" && d !== null && "message" in d) {
              const msg = (d as { message?: unknown }).message;
              return typeof msg === "string" ? msg : "";
            }
            return typeof d === "string" ? d : "";
          })
          .filter(Boolean);
        if (detailMsgs.length > 0) {
          return sanitizeMessage(detailMsgs.join(". "));
        }
      } else if (typeof error.details === "string" && error.details.trim()) {
        return sanitizeMessage(error.details);
      }
      return sanitizeMessage(error.message) || "Bad request. Please check input parameters.";
    }
    if (error.status === 404) {
      return "The requested resource could not be found.";
    }
    if (error.status === 409) {
      if (
        error.code === "LEASE_CONFLICT" ||
        error.code === "SETTLEMENT_ALREADY_PROCESSING" ||
        error.message?.toLowerCase().includes("lease") ||
        error.message?.toLowerCase().includes("settlement")
      ) {
        return "This settlement is already being processed.";
      }
      if (error.code === "MEMBERSHIP_ALREADY_PROCESSED") {
        return "This membership has already been processed. Refresh to view the latest status.";
      }
      if (error.code === "DRIVER_ALREADY_ASSIGNED") {
        return "This driver is already actively assigned to another vehicle.";
      }
      if (error.code === "VEHICLE_ALREADY_ASSIGNED") {
        return "This vehicle is already actively assigned to another driver.";
      }
      return sanitizeMessage(error.message) || "A conflict occurred with the current state of this resource.";
    }
    if (error.status === 429) {
      return "Too many requests. Please wait before retrying.";
    }
    if (error.status === 503) {
      return "Administrative service is currently unavailable. Please try again later.";
    }
    if (error.status === 502 || error.status === 504) {
      return "Financial settlement gateway is currently unavailable or timed out. Please try again.";
    }
    if (error.status >= 500) {
      return "Something went wrong on the server. Please try again later.";
    }
    return sanitizeMessage(error.message) || "An unexpected error occurred.";
  }

  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      return "Network failure. Check your connection and retry.";
    }
    if (error.name === "AbortError" || error.message.toLowerCase().includes("timeout")) {
      return "Request timed out. Please try again.";
    }
    return sanitizeMessage(error.message);
  }

  return "An unexpected error occurred.";
}

