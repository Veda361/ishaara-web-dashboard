import { NextRequest, NextResponse } from "next/server";
import { proxyAdminRequest, isValidSettlementId } from "@/lib/server/adminProxy";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ settlementId: string }> | { settlementId: string } }
) {
  const resolvedParams = await context.params;
  const settlementId = resolvedParams.settlementId;

  const requestId = req.headers.get("x-request-id") || undefined;

  if (!isValidSettlementId(settlementId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_SETTLEMENT_ID",
          message: "Invalid or malformed settlement ID.",
          requestId,
        },
      },
      {
        status: 400,
        headers: requestId ? { "X-Request-ID": requestId } : undefined,
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_REQUEST_BODY",
          message: "Request body must be valid JSON containing a non-empty 'reason'.",
          requestId,
        },
      },
      {
        status: 400,
        headers: requestId ? { "X-Request-ID": requestId } : undefined,
      }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !("reason" in body) ||
    typeof (body as { reason: unknown }).reason !== "string"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MISSING_RETRY_REASON",
          message: "A valid administrative reason is required to retry a failed settlement.",
          requestId,
        },
      },
      {
        status: 400,
        headers: requestId ? { "X-Request-ID": requestId } : undefined,
      }
    );
  }

  const reason = (body as { reason: string }).reason.trim();
  if (reason.length < 3) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_REASON_LENGTH",
          message: "Administrative retry reason must be at least 3 characters long.",
          requestId,
        },
      },
      {
        status: 400,
        headers: requestId ? { "X-Request-ID": requestId } : undefined,
      }
    );
  }

  const upstreamPath = `/api/v1/payments/settlements/${encodeURIComponent(settlementId)}/retry`;
  return proxyAdminRequest(req, upstreamPath, "POST", { reason });
}
