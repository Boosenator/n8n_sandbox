import { NextRequest, NextResponse } from "next/server";
import { buildSendPulsePayload } from "@/lib/sendpulse-payload";
import { buildLocalReply } from "@/lib/sandbox-store";
import {
  createDialogReview,
  ensureConversationContext,
  logEvent,
  logToolTrace
} from "@/lib/supabase-admin";
import { SendMessageRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SendMessageRequest;

  if (!body.text?.trim() || !body.contactId?.trim()) {
    return NextResponse.json(
      { ok: false, error: "text and contactId are required" },
      { status: 400 }
    );
  }

  const normalized = {
    ...body,
    text: body.text.trim()
  };

  const context = await ensureConversationContext(normalized);
  const message = await logEvent({
    userId: context.userId,
    sessionId: context.sessionId,
    contactId: normalized.contactId,
    eventType: "incoming_message",
    eventSubtype: "client",
    source: "sandbox-ui",
    title: normalized.contactName,
    detail: normalized.text,
    tone: "neutral",
    payload: {
      contact_name: normalized.contactName,
      contact_username: normalized.contactUsername,
      persona: normalized.persona
    }
  });
  const payload = buildSendPulsePayload(normalized);

  let webhookStatus: "skipped" | "sent" | "failed" = "skipped";

  if (normalized.webhookUrl?.trim()) {
    try {
      const response = await fetch(normalized.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      webhookStatus = response.ok ? "sent" : "failed";
    } catch {
      webhookStatus = "failed";
    }
  }

  if (webhookStatus !== "sent") {
    const reply = buildLocalReply(normalized);
    await logEvent({
      userId: context.userId,
      sessionId: context.sessionId,
      contactId: normalized.contactId,
      eventType: "outgoing_message",
      eventSubtype: "fallback",
      source: "sandbox-local",
      title: "VAngel Sandbox",
      detail: reply,
      tone: "green"
    });
    await createDialogReview({
      userId: context.userId,
      sessionId: context.sessionId,
      contactId: normalized.contactId,
      severity: "green",
      triggerReasons: ["normal_flow"],
      userMessage: normalized.text,
      agentReply: reply,
      confidenceScore: 8,
      toneScore: 8,
      hallucinationScore: 8
    });
  }

  await logToolTrace({
    toolName: "send_message",
    status: webhookStatus === "failed" ? "error" : "success",
    input: {
      contactId: normalized.contactId,
      webhookUrl: normalized.webhookUrl,
      text: normalized.text
    },
    output: {
      webhookStatus
    },
    contactId: normalized.contactId
  });

  return NextResponse.json({
    ok: true,
    messageId: message?.id ?? context.sessionId,
    webhookStatus,
    payload: normalized.debugPayload ? payload : undefined
  });
}
