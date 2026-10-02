import { NextRequest } from "next/server";
import { proxyAdminRequest } from "@/lib/server/adminProxy";

export async function GET(req: NextRequest) {
  const { search } = new URL(req.url);
  const upstreamPath = `/api/v1/payments/settlements${search}`;
  return proxyAdminRequest(req, upstreamPath, "GET");
}
