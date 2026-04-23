import { NextRequest, NextResponse } from "next/server";
import { appendSalonMessage } from "@/lib/sandbox-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    contact_id?: string;
    messages?: Array<{ message?: { text?: string } }>;
  };

  const contactId = body.contact_id;
  const text = body.messages?.[0]?.message?.text;

  if (!contactId || !text) {
    return NextResponse.json(
      { ok: false, error: "contact_id and message text are required" },
      { status: 400 }
    );
  }

  const item = appendSalonMessage(contactId, text);
  return NextResponse.json({ ok: true, item });
}
