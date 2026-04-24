import { NextResponse } from "next/server";
import { exportSupabaseSnapshot } from "@/lib/supabase-admin";

export async function GET() {
  return NextResponse.json({
    ok: true,
    snapshot: await exportSupabaseSnapshot()
  });
}
