import { ObservabilityEventRecord, ObservabilitySnapshot, SnapshotSource } from "@/lib/types";
import { getObservabilitySnapshot as getLocalObservabilitySnapshot } from "@/lib/sandbox-store";
import { getSupabaseObservability } from "@/lib/supabase-admin";

function resolveSource(
  localItems: { id: string }[],
  remoteItems: { id: string }[]
): SnapshotSource {
  if (remoteItems.length && localItems.length) {
    return "merged";
  }

  if (remoteItems.length) {
    return "supabase";
  }

  return "local";
}

function buildEvents(snapshot: Pick<ObservabilitySnapshot, "toolCalls" | "messagesLog" | "dialogReviews" | "escalations">) {
  const events: ObservabilityEventRecord[] = [
    ...snapshot.messagesLog.map((item) => ({
      id: `msg-${item.id}`,
      kind: "message" as const,
      contactId: item.contactId,
      timestamp: item.timestamp,
      title: `${item.direction} ${item.service ?? item.channel}`,
      detail: item.agentReply ?? item.userMessage ?? item.text,
      tone:
        item.direction === "incoming"
          ? ("neutral" as const)
          : item.direction === "outgoing"
            ? ("green" as const)
            : ("neutral" as const),
      meta: item.provider
    })),
    ...snapshot.toolCalls.map((item) => ({
      id: `tool-${item.id}`,
      kind: "tool" as const,
      contactId: item.contactId,
      timestamp: item.timestamp,
      title: item.toolName,
      detail: item.status === "error" ? "Tool call failed" : "Tool call completed",
      tone: item.status === "error" ? ("red" as const) : ("neutral" as const),
      meta: item.status
    })),
    ...snapshot.dialogReviews.map((item) => ({
      id: `review-${item.id}`,
      kind: "review" as const,
      contactId: item.contactId,
      timestamp: item.timestamp,
      title: item.severity.toUpperCase(),
      detail: item.triggerReasons.join(", "),
      tone: item.severity,
      meta: `confidence ${item.confidenceScore.toFixed(2)}`
    })),
    ...snapshot.escalations.map((item) => ({
      id: `escalation-${item.id}`,
      kind: "escalation" as const,
      contactId: item.contactId,
      timestamp: item.timestamp,
      title: item.reason,
      detail: item.context || "Escalation requested",
      tone: "red" as const
    }))
  ];

  return events.sort((left, right) => right.timestamp - left.timestamp).slice(0, 200);
}

export async function getObservabilitySnapshot(contactId?: string) {
  const localSnapshot = getLocalObservabilitySnapshot(contactId);
  const remoteSnapshot = await getSupabaseObservability(contactId);

  const messagesLog = remoteSnapshot.messagesLog.length
    ? remoteSnapshot.messagesLog
    : localSnapshot.messagesLog;
  const dialogReviews = remoteSnapshot.dialogReviews.length
    ? remoteSnapshot.dialogReviews
    : localSnapshot.dialogReviews;
  const toolCalls = remoteSnapshot.toolCalls.length ? remoteSnapshot.toolCalls : localSnapshot.toolCalls;
  const escalations = remoteSnapshot.escalations.length
    ? remoteSnapshot.escalations
    : localSnapshot.escalations;
  const clients = remoteSnapshot.clients.length ? remoteSnapshot.clients : localSnapshot.clients;
  const bookings = remoteSnapshot.bookings.length ? remoteSnapshot.bookings : localSnapshot.bookings;

  return {
    ...localSnapshot,
    toolCalls,
    messagesLog,
    dialogReviews,
    clients,
    bookings,
    escalations,
    events: buildEvents({
      toolCalls,
      messagesLog,
      dialogReviews,
      escalations
    }),
    sources: {
      messagesLog: resolveSource(localSnapshot.messagesLog, remoteSnapshot.messagesLog),
      dialogReviews: resolveSource(localSnapshot.dialogReviews, remoteSnapshot.dialogReviews)
    }
  };
}
