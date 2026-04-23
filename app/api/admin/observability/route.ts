import { NextRequest, NextResponse } from "next/server";
import { getObservabilitySnapshot } from "@/lib/sandbox-store";

export async function GET(request: NextRequest) {
  const contactId = request.nextUrl.searchParams.get("contact_id") ?? undefined;

  return NextResponse.json({
    ok: true,
    snapshot: getObservabilitySnapshot(contactId)
  });
}
