import { NextRequest } from "next/server";
import { proxyAdminRequest } from "@/lib/server/adminProxy";

export async function POST(req: NextRequest) {
  const upstreamPath = `/api/v1/payments/settlements/reconciliation/sweep`;
  return proxyAdminRequest(req, upstreamPath, "POST", {});
}
