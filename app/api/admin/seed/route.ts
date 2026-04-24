import { NextResponse } from "next/server";
import { seedSupabaseSnapshot } from "@/lib/supabase-admin";

export async function POST() {
  return NextResponse.json({
    ok: true,
    snapshot: await seedSupabaseSnapshot()
  });
}
