import { NextRequest, NextResponse } from "next/server";
import { resetMessages } from "@/lib/sandbox-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { contactId?: string };

  if (!body.contactId) {
    return NextResponse.json(
      { ok: false, error: "contactId is required" },
      { status: 400 }
    );
  }

  resetMessages(body.contactId);

  return NextResponse.json({ ok: true });
}
