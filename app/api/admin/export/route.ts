import { NextResponse } from "next/server";
import { getAdminSnapshot } from "@/lib/sandbox-store";

export async function GET() {
  return NextResponse.json({
    ok: true,
    snapshot: getAdminSnapshot()
  });
}
