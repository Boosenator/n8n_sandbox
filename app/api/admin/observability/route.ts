import { NextRequest, NextResponse } from "next/server";
import { getObservabilitySnapshot } from "@/lib/observability";

export async function GET(request: NextRequest) {
  const contactId = request.nextUrl.searchParams.get("contact_id") ?? undefined;

  return NextResponse.json({
    ok: true,
    snapshot: await getObservabilitySnapshot(contactId)
  });
}
