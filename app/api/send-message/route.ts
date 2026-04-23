import { NextRequest, NextResponse } from "next/server";
import { buildSendPulsePayload } from "@/lib/sendpulse-payload";
import {
  appendClientMessage,
  appendSalonMessage,
  buildLocalReply,
  logDialogReview,
  logToolCall
} from "@/lib/sandbox-store";
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

  const message = appendClientMessage(normalized);
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
    appendSalonMessage(normalized.contactId, reply);
    logDialogReview({
      sessionId: normalized.contactId,
      contactId: normalized.contactId,
      userMessage: normalized.text,
      agentReply: reply
    });
  }

  logToolCall({
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
    messageId: message.id,
    webhookStatus,
    payload: normalized.debugPayload ? payload : undefined
  });
}
