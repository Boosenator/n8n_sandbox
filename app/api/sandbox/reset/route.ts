import { NextRequest, NextResponse } from "next/server";
import { resetConversation } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { contactId?: string };

  if (!body.contactId) {
    return NextResponse.json(
      { ok: false, error: "contactId is required" },
      { status: 400 }
    );
  }

  await resetConversation(body.contactId);

  return NextResponse.json({ ok: true });
}
