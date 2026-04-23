import { NextRequest, NextResponse } from "next/server";
import { listMessages } from "@/lib/sandbox-store";

export async function GET(request: NextRequest) {
  const contactId = request.nextUrl.searchParams.get("contact_id");
  const sinceValue = request.nextUrl.searchParams.get("since");

  if (!contactId) {
    return NextResponse.json(
      { ok: false, error: "contact_id is required" },
      { status: 400 }
    );
  }

  const since = sinceValue ? Number(sinceValue) : undefined;
  const items = listMessages(contactId, Number.isFinite(since) ? since : undefined);

  return NextResponse.json({
    ok: true,
    items
  });
}
