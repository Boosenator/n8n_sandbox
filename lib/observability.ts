import {
  DialogReviewRecord,
  MessageLogRecord,
  ObservabilityEventRecord,
  ObservabilitySnapshot,
  SnapshotSource
} from "@/lib/types";
import { getObservabilitySnapshot as getLocalObservabilitySnapshot } from "@/lib/sandbox-store";

type ReviewRow = {
  id: string;
  session_id?: string | null;
  contact_id?: string | null;
  severity?: string | null;
  trigger_reasons?: unknown;
  user_message?: string | null;
  agent_reply?: string | null;
  confidence_score?: number | string | null;
  tone_score?: number | string | null;
  hallucination_score?: number | string | null;
  created_at?: string | null;
};

type MessageRow = {
  id: string;
  session_id?: string | null;
  contact_id?: string | null;
  direction?: string | null;
  text?: string | null;
  channel?: string | null;
  provider?: string | null;
  payload?: Record<string, unknown> | null;
  timestamp?: string | null;
  created_at?: string | null;
  user_message?: string | null;
  agent_reply?: string | null;
  service?: string | null;
  delivery_status?: string | null;
  http_status?: number | null;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  if (!url || !key) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    key
  };
}

function normalizeTimestamp(value?: string | number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (!value) {
    return Date.now();
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeReasons(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return ["normal_flow"];
}

function normalizeSeverity(value?: string | null): DialogReviewRecord["severity"] {
  return value === "red" || value === "yellow" || value === "green" ? value : "green";
}

function normalizeDirection(value?: string | null): MessageLogRecord["direction"] {
  return value === "incoming" || value === "outgoing" || value === "internal" ? value : "internal";
}

function toNumber(value?: number | string | null, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

async function fetchSupabaseRows<T>(
  table: string,
  columns: string,
  {
    contactId,
    limit = 50
  }: {
    contactId?: string;
    limit?: number;
  }
) {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const url = new URL(`${config.url}/rest/v1/${table}`);
  url.searchParams.set("select", columns);
  url.searchParams.set("order", "created_at.desc.nullslast,timestamp.desc.nullslast");
  url.searchParams.set("limit", String(limit));

  if (contactId) {
    url.searchParams.set("contact_id", `eq.${contactId}`);
  }

  try {
    const response = await fetch(url, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T[];
  } catch {
    return null;
  }
}

async function fetchDialogReviews(contactId?: string) {
  const rows = await fetchSupabaseRows<ReviewRow>(
    "dialogs_for_review",
    "id,session_id,contact_id,severity,trigger_reasons,user_message,agent_reply,confidence_score,tone_score,hallucination_score,created_at",
    { contactId, limit: 24 }
  );

  if (!rows) {
    return null;
  }

  return rows.map<DialogReviewRecord>((row) => ({
    id: row.id,
    sessionId: row.session_id ?? row.contact_id ?? "",
    contactId: row.contact_id ?? "",
    severity: normalizeSeverity(row.severity),
    triggerReasons: normalizeReasons(row.trigger_reasons),
    userMessage: row.user_message ?? "",
    agentReply: row.agent_reply ?? "",
    confidenceScore: toNumber(row.confidence_score, 0),
    toneScore: toNumber(row.tone_score, 0),
    hallucinationScore: toNumber(row.hallucination_score, 0),
    timestamp: normalizeTimestamp(row.created_at)
  }));
}

async function fetchMessagesLog(contactId?: string) {
  const rows =
    (await fetchSupabaseRows<MessageRow>(
      "messages_log",
      "id,session_id,contact_id,direction,text,channel,provider,payload,timestamp,created_at,user_message,agent_reply,service,delivery_status,http_status",
      { contactId, limit: 80 }
    )) ??
    (await fetchSupabaseRows<MessageRow>(
      "messages_log",
      "id,session_id,contact_id,direction,text,channel,provider,payload,created_at",
      { contactId, limit: 80 }
    ));

  if (!rows) {
    return null;
  }

  return rows.map<MessageLogRecord>((row) => ({
    id: row.id,
    sessionId: row.session_id ?? row.contact_id ?? "",
    contactId: row.contact_id ?? "",
    direction: normalizeDirection(row.direction),
    text: row.text ?? row.agent_reply ?? row.user_message ?? "",
    channel: row.channel ?? row.service ?? "instagram",
    provider: row.provider ?? "supabase",
    payload: row.payload ?? {},
    timestamp: normalizeTimestamp(row.timestamp ?? row.created_at),
    userMessage: row.user_message ?? undefined,
    agentReply: row.agent_reply ?? undefined,
    service: row.service ?? row.channel ?? undefined,
    deliveryStatus: row.delivery_status ?? undefined,
    httpStatus: row.http_status ?? undefined
  }));
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

function resolveSource(
  localItems: { id: string }[],
  remoteItems: { id: string }[] | null
): SnapshotSource {
  if (remoteItems?.length && localItems.length) {
    return "merged";
  }

  if (remoteItems?.length) {
    return "supabase";
  }

  return "local";
}

export async function getObservabilitySnapshot(contactId?: string) {
  const localSnapshot = getLocalObservabilitySnapshot(contactId);
  const [remoteReviews, remoteMessages] = await Promise.all([
    fetchDialogReviews(contactId),
    fetchMessagesLog(contactId)
  ]);

  const dialogReviews = remoteReviews?.length ? remoteReviews : localSnapshot.dialogReviews;
  const messagesLog = remoteMessages?.length ? remoteMessages : localSnapshot.messagesLog;

  const snapshot: ObservabilitySnapshot = {
    ...localSnapshot,
    dialogReviews,
    messagesLog,
    events: buildEvents({
      toolCalls: localSnapshot.toolCalls,
      messagesLog,
      dialogReviews,
      escalations: localSnapshot.escalations
    }),
    sources: {
      messagesLog: resolveSource(localSnapshot.messagesLog, remoteMessages),
      dialogReviews: resolveSource(localSnapshot.dialogReviews, remoteReviews)
    }
  };

  return snapshot;
}
