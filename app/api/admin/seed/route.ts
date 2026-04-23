import { NextResponse } from "next/server";
import { seedAdminSnapshot } from "@/lib/sandbox-store";

export async function POST() {
  return NextResponse.json({
    ok: true,
    snapshot: seedAdminSnapshot()
  });
}
