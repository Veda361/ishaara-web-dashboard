import { NextRequest, NextResponse } from "next/server";
import { proxyAdminRequest, isValidSettlementId } from "@/lib/server/adminProxy";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ settlementId: string }> | { settlementId: string } }
) {
  const resolvedParams = await context.params;
  const settlementId = resolvedParams.settlementId;

  if (!isValidSettlementId(settlementId)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_SETTLEMENT_ID",
          message: "Invalid or malformed settlement ID.",
        },
      },
      { status: 400 }
    );
  }

  const upstreamPath = `/api/v1/payments/settlements/${encodeURIComponent(settlementId)}/process`;
  return proxyAdminRequest(req, upstreamPath, "POST", {});
}
