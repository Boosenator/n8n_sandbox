import { NextRequest, NextResponse } from "next/server";
import {
  createDialogReview,
  ensureConversationContext,
  logEvent,
  logToolTrace
} from "@/lib/supabase-admin";

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

  const context = await ensureConversationContext({
    contactId
  });
  const item = await logEvent({
    userId: context.userId,
    sessionId: context.sessionId,
    contactId,
    eventType: "outgoing_message",
    eventSubtype: "sandbox_receive",
    source: "sandbox-receive",
    title: "VAngel Admin Agent",
    detail: text,
    tone: "green",
    payload: body as Record<string, unknown>
  });
  await createDialogReview({
    userId: context.userId,
    sessionId: context.sessionId,
    contactId,
    severity: "green",
    triggerReasons: ["normal_flow"],
    userMessage: "",
    agentReply: text,
    confidenceScore: 8,
    toneScore: 8,
    hallucinationScore: 8
  });
  await logToolTrace({
    toolName: "sandbox_receive",
    status: "success",
    input: body as Record<string, unknown>,
    output: { messageId: item?.id ?? context.sessionId },
    contactId
  });
  return NextResponse.json({ ok: true, item });
}
