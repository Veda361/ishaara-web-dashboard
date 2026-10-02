import { NextRequest } from "next/server";
import { proxyAdminRequest } from "@/lib/server/adminProxy";

export async function GET(req: NextRequest) {
  const upstreamPath = `/api/v1/payments/settlements/reconciliation/audit`;
  return proxyAdminRequest(req, upstreamPath, "GET");
}
