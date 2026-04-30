import {
  BookingRecord,
  ClientRecord,
  DialogReviewRecord,
  EscalationRecord,
  MessageLogRecord,
  SandboxMessage,
  ServiceItem,
  StaffMember,
  ToolTraceRecord
} from "@/lib/types";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

type SupabaseConfig = {
  url: string;
  key: string;
};

type EventRow = {
  id: string;
  user_id?: string | null;
  session_id?: string | null;
  contact_id?: string | null;
  event_type?: string | null;
  event_subtype?: string | null;
  source?: string | null;
  title?: string | null;
  detail?: string | null;
  tone?: string | null;
  payload?: Record<string, Json> | null;
  event_at?: string | null;
  created_at?: string | null;
};

type UserRow = {
  id: string;
  contact_id: string;
  name?: string | null;
  username?: string | null;
  phone?: string | null;
  channel?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
};

type SessionRow = {
  id: string;
  session_id: string;
  user_id?: string | null;
  contact_id: string;
  contact_name?: string | null;
  contact_username?: string | null;
  persona?: string | null;
  webhook_url?: string | null;
  debug_payload?: boolean | null;
  status?: string | null;
  dialog_state?: Record<string, Json> | null;
  started_at?: string | null;
  last_activity_at?: string | null;
  resolved_at?: string | null;
};

type ProfileRow = {
  id: string;
  user_id?: string | null;
  contact_id: string;
  summary?: string | null;
  preferred_services?: Json[] | null;
  preferred_staff?: Json[] | null;
  visit_pattern?: string | null;
  price_sensitivity?: string | null;
  tone_profile?: string | null;
  risk_flags?: Json[] | null;
  notes?: Json[] | null;
  profile_json?: Record<string, Json> | null;
  last_profile_update?: string | null;
};

type StaffRow = {
  id: string;
  external_id?: string | null;
  name: string;
  role?: string | null;
  active?: boolean | null;
  notes?: string | null;
};

type ServiceCategoryRow = {
  id: string;
  external_id?: string | null;
  name: string;
  description?: string | null;
  sort_order?: number | null;
  active?: boolean | null;
};

type ServiceRow = {
  id: string;
  external_id?: string | null;
  category_id?: string | null;
  name: string;
  duration_minutes?: number | null;
  price_from?: number | null;
  active?: boolean | null;
};

type StaffServiceRow = {
  staff_id: string;
  service_id: string;
  seance_length?: number | null;
  price_override?: number | null;
  active?: boolean | null;
};

type BookingRow = {
  id: string;
  user_id?: string | null;
  session_id?: string | null;
  contact_id?: string | null;
  staff_id?: string | null;
  service_id?: string | null;
  starts_at: string;
  ends_at?: string | null;
  status?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  source?: string | null;
  metadata?: Record<string, Json> | null;
};

type ReviewRow = {
  id: string;
  user_id?: string | null;
  session_id?: string | null;
  contact_id?: string | null;
  source?: string | null;
  severity?: string | null;
  trigger_reasons?: Json[] | string | null;
  user_message?: string | null;
  agent_reply?: string | null;
  confidence_score?: number | string | null;
  tone_score?: number | string | null;
  hallucination_score?: number | string | null;
  raw_review?: Record<string, Json> | null;
  status?: string | null;
  reviewed_by?: string | null;
  review_note?: string | null;
  created_at?: string | null;
};

type ScheduleRow = {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working?: boolean | null;
  valid_from?: string | null;
  valid_to?: string | null;
};

type ExceptionRow = {
  id: string;
  staff_id: string;
  exception_date: string;
  start_time?: string | null;
  end_time?: string | null;
  exception_type?: string | null;
  label?: string | null;
  notes?: string | null;
};

function getSupabaseConfig(): SupabaseConfig | null {
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

  const parsed = value ? Date.parse(String(value)) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeReasons(value: ReviewRow["trigger_reasons"]) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return ["normal_flow"];
}

function normalizeSeverity(value?: string | null): DialogReviewRecord["severity"] {
  return value === "green" || value === "yellow" || value === "red" ? value : "green";
}

function normalizeDirection(value?: string | null): MessageLogRecord["direction"] {
  return value === "incoming" || value === "outgoing" || value === "internal" ? value : "internal";
}

function toNumber(value?: string | number | null, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

async function supabaseRequest<T>(
  table: string,
  {
    method = "GET",
    select,
    filters,
    order,
    limit,
    body,
    single = false,
    upsert = false,
    onConflict
  }: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    select?: string;
    filters?: Record<string, string>;
    order?: string;
    limit?: number;
    body?: Record<string, Json> | Array<Record<string, Json>>;
    single?: boolean;
    upsert?: boolean;
    onConflict?: string;
  } = {}
): Promise<T | null> {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const url = new URL(`${config.url}/rest/v1/${table}`);

  if (select) {
    url.searchParams.set("select", select);
  }

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  if (order) {
    url.searchParams.set("order", order);
  }

  if (typeof limit === "number") {
    url.searchParams.set("limit", String(limit));
  }

  if (onConflict) {
    url.searchParams.set("on_conflict", onConflict);
  }

  const headers: Record<string, string> = {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`
  };

  if (method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
    headers["Prefer"] = upsert
      ? "resolution=merge-duplicates,return=representation"
      : "return=representation";
  } else if (single) {
    headers["Accept"] = "application/vnd.pgrst.object+json";
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    if (method === "DELETE" && !single) {
      return null;
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function selectRows<T>(
  table: string,
  select: string,
  {
    filters,
    order,
    limit
  }: {
    filters?: Record<string, string>;
    order?: string;
    limit?: number;
  } = {}
) {
  return (await supabaseRequest<T[]>(table, {
    select,
    filters,
    order,
    limit
  })) ?? [];
}

async function upsertRow<T>(
  table: string,
  row: Record<string, Json>,
  onConflict: string
) {
  const rows = await supabaseRequest<T[]>(table, {
    method: "POST",
    body: row,
    upsert: true,
    onConflict
  });

  return rows?.[0] ?? null;
}

async function insertRow<T>(table: string, row: Record<string, Json>) {
  const rows = await supabaseRequest<T[]>(table, {
    method: "POST",
    body: row
  });

  return rows?.[0] ?? null;
}

async function updateRows<T>(
  table: string,
  row: Record<string, Json>,
  filters: Record<string, string>
) {
  return (await supabaseRequest<T[]>(table, {
    method: "PATCH",
    body: row,
    filters
  })) ?? [];
}

async function deleteRows(table: string, filters: Record<string, string>) {
  await supabaseRequest<null>(table, {
    method: "DELETE",
    filters
  });
}

async function getUserByContactId(contactId: string) {
  const rows = await selectRows<UserRow>("users", "id,contact_id,name,username,phone,channel", {
    filters: {
      contact_id: `eq.${contactId}`
    },
    limit: 1
  });

  return rows[0] ?? null;
}

async function getSessionBySessionId(sessionId: string) {
  const rows = await selectRows<SessionRow>(
    "sessions",
    "id,session_id,user_id,contact_id,contact_name,contact_username,persona,webhook_url,debug_payload,status,dialog_state,started_at,last_activity_at,resolved_at",
    {
      filters: {
        session_id: `eq.${sessionId}`
      },
      limit: 1
    }
  );

  return rows[0] ?? null;
}

export async function ensureConversationContext(input: {
  contactId: string;
  contactName?: string;
  contactUsername?: string;
  webhookUrl?: string;
  persona?: string;
  debugPayload?: boolean;
}) {
  const now = new Date().toISOString();
  const channel = "instagram";

  const user = await upsertRow<UserRow>(
    "users",
    {
      contact_id: input.contactId,
      name: input.contactName ?? null,
      username: input.contactUsername ?? null,
      channel,
      last_seen_at: now
    },
    "contact_id"
  );

  const session = await upsertRow<SessionRow>(
    "sessions",
    {
      session_id: input.contactId,
      user_id: user?.id ?? null,
      contact_id: input.contactId,
      contact_name: input.contactName ?? null,
      contact_username: input.contactUsername ?? null,
      persona: input.persona ?? "new_client",
      webhook_url: input.webhookUrl ?? null,
      debug_payload: Boolean(input.debugPayload),
      status: "active",
      last_activity_at: now
    },
    "session_id"
  );

  return {
    userId: user?.id ?? null,
    sessionId: session?.session_id ?? input.contactId,
    sessionRowId: session?.id ?? null
  };
}

export async function logEvent(input: {
  userId?: string | null;
  sessionId?: string | null;
  contactId?: string | null;
  eventType:
    | "incoming_message"
    | "outgoing_message"
    | "interim_message"
    | "tool_call"
    | "tool_result"
    | "review_signal"
    | "booking_created"
    | "booking_updated"
    | "booking_cancelled"
    | "escalation"
    | "session_status_changed"
    | "profile_updated"
    | "system";
  eventSubtype?: string | null;
  source?: string;
  title?: string | null;
  detail?: string | null;
  tone?: "neutral" | "green" | "yellow" | "red";
  payload?: Record<string, unknown>;
  eventAt?: string;
}) {
  return insertRow<EventRow>("event_log", {
    user_id: input.userId ?? null,
    session_id: input.sessionId ?? null,
    contact_id: input.contactId ?? null,
    event_type: input.eventType,
    event_subtype: input.eventSubtype ?? null,
    source: input.source ?? "system",
    title: input.title ?? null,
    detail: input.detail ?? null,
    tone: input.tone ?? "neutral",
    payload: (input.payload ?? {}) as Record<string, Json>,
    event_at: input.eventAt ?? new Date().toISOString()
  });
}

export async function createDialogReview(input: {
  userId?: string | null;
  sessionId?: string | null;
  contactId?: string | null;
  severity?: DialogReviewRecord["severity"];
  triggerReasons?: string[];
  userMessage?: string;
  agentReply?: string;
  confidenceScore?: number;
  toneScore?: number;
  hallucinationScore?: number;
  rawReview?: Record<string, unknown>;
}) {
  return insertRow<ReviewRow>("dialogs_for_review", {
    user_id: input.userId ?? null,
    session_id: input.sessionId ?? null,
    contact_id: input.contactId ?? null,
    source: "n8n",
    severity: input.severity ?? "green",
    trigger_reasons: input.triggerReasons ?? ["normal_flow"],
    user_message: input.userMessage ?? "",
    agent_reply: input.agentReply ?? "",
    confidence_score: input.confidenceScore ?? 8,
    tone_score: input.toneScore ?? 8,
    hallucination_score: input.hallucinationScore ?? 8,
    raw_review: (input.rawReview ?? {}) as Record<string, Json>,
    status: "pending"
  });
}

export async function logToolTrace(input: {
  toolName: string;
  status: "success" | "error";
  input: Record<string, unknown>;
  output?: Record<string, unknown> | null;
  contactId?: string;
}) {
  const context = input.contactId
    ? await ensureConversationContext({
        contactId: input.contactId
      })
    : { userId: null, sessionId: null };

  return logEvent({
    userId: context.userId,
    sessionId: context.sessionId,
    contactId: input.contactId,
    eventType: "tool_call",
    eventSubtype: input.status,
    source: "mock-altegio",
    title: input.toolName,
    detail: input.status === "error" ? "Tool call failed" : "Tool call completed",
    tone: input.status === "error" ? "red" : "neutral",
    payload: {
      input: input.input as Record<string, Json>,
      output: (input.output ?? {}) as Record<string, Json>
    }
  });
}

export async function listChatMessages(contactId: string, since?: number) {
  const rows = await selectRows<EventRow>(
    "event_log",
    "id,contact_id,event_type,title,detail,event_at,created_at,payload",
    {
      filters: {
        contact_id: `eq.${contactId}`,
        event_type: "in.(incoming_message,outgoing_message,interim_message)"
      },
      order: "event_at.asc",
      limit: 200
    }
  );

  return rows
    .map<SandboxMessage>((row) => ({
      id: row.id,
      author:
        row.event_type === "incoming_message"
          ? "client"
          : row.event_type === "interim_message"
            ? "system"
            : "salon",
      text: row.detail ?? row.title ?? "",
      timestamp: normalizeTimestamp(row.event_at ?? row.created_at)
    }))
    .filter((item) => (since ? item.timestamp > since : true));
}

export async function resetConversation(contactId: string) {
  await Promise.all([
    deleteRows("event_log", { contact_id: `eq.${contactId}` }),
    deleteRows("dialogs_for_review", { contact_id: `eq.${contactId}` })
  ]);
}

function mapStaff(staffRows: StaffRow[], links: StaffServiceRow[]): StaffMember[] {
  return staffRows.map((item) => ({
    id: item.id,
    name: item.name,
    role: item.role ?? "",
    active: item.active ?? true,
    notes: item.notes ?? "",
    serviceIds: links.filter((link) => link.staff_id === item.id && link.active !== false).map((link) => link.service_id)
  }));
}

function mapService(row: ServiceRow): ServiceItem {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.duration_minutes ?? 60,
    priceFrom: Number(row.price_from ?? 0),
    active: row.active ?? true
  };
}

function mapBooking(row: BookingRow): BookingRecord {
  return {
    id: row.id,
    staffId: row.staff_id ?? "",
    serviceId: row.service_id ?? "",
    datetime: row.starts_at,
    status: row.status === "cancelled" ? "cancelled" : "confirmed",
    clientName: row.client_name ?? "",
    clientPhone: row.client_phone ?? "",
    source: row.source === "manual" ? "manual" : row.source === "n8n" ? "n8n" : "sandbox"
  };
}

export async function getAdminStaff() {
  const [staffRows, links] = await Promise.all([
    selectRows<StaffRow>("staff", "id,external_id,name,role,active,notes", {
      order: "created_at.asc",
      limit: 200
    }),
    selectRows<StaffServiceRow>("staff_services", "staff_id,service_id,seance_length,price_override,active", {
      limit: 500
    })
  ]);

  return mapStaff(staffRows, links);
}

export async function upsertAdminStaff(input: {
  id?: string;
  name: string;
  role?: string;
  notes?: string;
  active?: boolean;
  serviceIds?: string[];
}) {
  const item =
    input.id && input.id.trim()
      ? (
          await updateRows<StaffRow>(
            "staff",
            {
              name: input.name,
              role: input.role ?? null,
              notes: input.notes ?? null,
              active: input.active ?? true
            },
            { id: `eq.${input.id}` }
          )
        )[0]
      : await insertRow<StaffRow>("staff", {
          name: input.name,
          role: input.role ?? null,
          notes: input.notes ?? null,
          active: input.active ?? true
        });

  if (!item) {
    return null;
  }

  await deleteRows("staff_services", { staff_id: `eq.${item.id}` });

  if (input.serviceIds?.length) {
    await Promise.all(
      input.serviceIds.map((serviceId) =>
        insertRow("staff_services", {
          staff_id: item.id,
          service_id: serviceId,
          active: true
        })
      )
    );
  }

  return item;
}

export async function deleteAdminStaff(id: string) {
  await deleteRows("staff", { id: `eq.${id}` });
}

export async function getAdminServices() {
  const rows = await selectRows<ServiceRow>(
    "services",
    "id,external_id,category_id,name,duration_minutes,price_from,active",
    { order: "created_at.asc", limit: 400 }
  );

  return rows.map(mapService);
}

export async function upsertAdminService(input: {
  id?: string;
  name: string;
  durationMinutes?: number;
  priceFrom?: number;
  active?: boolean;
  categoryId?: string;
}) {
  return input.id && input.id.trim()
    ? (
        await updateRows<ServiceRow>(
          "services",
          {
            name: input.name,
            duration_minutes: input.durationMinutes ?? 60,
            price_from: input.priceFrom ?? 0,
            active: input.active ?? true,
            category_id: input.categoryId ?? null
          },
          { id: `eq.${input.id}` }
        )
      )[0] ?? null
    : insertRow<ServiceRow>("services", {
        name: input.name,
        duration_minutes: input.durationMinutes ?? 60,
        price_from: input.priceFrom ?? 0,
        active: input.active ?? true,
        category_id: input.categoryId ?? null
      });
}

export async function deleteAdminService(id: string) {
  await deleteRows("services", { id: `eq.${id}` });
}

export async function getAdminClients() {
  const [users, profiles, bookings] = await Promise.all([
    selectRows<UserRow>("users", "id,contact_id,name,username,phone,channel,first_seen_at,last_seen_at", {
      order: "last_seen_at.desc",
      limit: 400
    }),
    selectRows<ProfileRow>(
      "customer_profiles",
      "id,user_id,contact_id,summary,preferred_services,preferred_staff,visit_pattern,price_sensitivity,tone_profile,risk_flags,notes,profile_json,last_profile_update",
      { limit: 400 }
    ),
    selectRows<BookingRow>("bookings", "id,user_id,status", { limit: 800 })
  ]);

  return users.map<ClientRecord>((user) => {
    const profile = profiles.find((item) => item.user_id === user.id || item.contact_id === user.contact_id);
    const visitCount = bookings.filter(
      (item) =>
        item.user_id === user.id &&
        (item.status === "confirmed" || item.status === "completed")
    ).length;
    const tags = Array.isArray(profile?.profile_json?.tags)
      ? profile?.profile_json?.tags.map((item) => String(item))
      : [];

    return {
      id: user.id,
      name: user.name ?? user.contact_id,
      phone: user.phone ?? "",
      visitCount,
      notes: profile?.summary ?? "",
      tags
    };
  });
}

export async function upsertAdminClient(input: {
  id?: string;
  name: string;
  phone?: string;
  notes?: string;
  tags?: string[];
}) {
  const existingUser =
    input.id && input.id.trim()
      ? (
          await selectRows<UserRow>("users", "id,contact_id,name,phone", {
            filters: { id: `eq.${input.id}` },
            limit: 1
          })
        )[0] ?? null
      : null;

  const contactId = existingUser?.contact_id ?? input.phone?.trim() ?? `manual_${crypto.randomUUID()}`;
  const user =
    existingUser ??
    (await upsertRow<UserRow>(
      "users",
      {
        contact_id: contactId,
        name: input.name,
        phone: input.phone?.trim() ?? null,
        channel: "instagram",
        last_seen_at: new Date().toISOString()
      },
      "contact_id"
    ));

  if (!user) {
    return null;
  }

  await updateRows<UserRow>(
    "users",
    {
      name: input.name,
      phone: input.phone?.trim() ?? null
    },
    { id: `eq.${user.id}` }
  );

  await upsertRow<ProfileRow>(
    "customer_profiles",
    {
      user_id: user.id,
      contact_id: user.contact_id,
      summary: input.notes ?? null,
      profile_json: {
        tags: input.tags ?? []
      },
      notes: (input.tags ?? []).map((item) => item)
    },
    "contact_id"
  );

  return user;
}

export async function deleteAdminClient(id: string) {
  await deleteRows("users", { id: `eq.${id}` });
}

export async function getAdminBookings() {
  const rows = await selectRows<BookingRow>(
    "bookings",
    "id,user_id,session_id,contact_id,staff_id,service_id,starts_at,ends_at,status,client_name,client_phone,source,metadata",
    { order: "starts_at.desc", limit: 400 }
  );

  return rows.map(mapBooking);
}

export async function upsertAdminBooking(input: {
  id?: string;
  staffId: string;
  serviceId: string;
  datetime: string;
  clientName: string;
  clientPhone: string;
  status?: BookingRecord["status"];
  source?: BookingRecord["source"];
}) {
  const user = await upsertRow<UserRow>(
    "users",
    {
      contact_id: input.clientPhone,
      name: input.clientName,
      phone: input.clientPhone,
      channel: "instagram",
      last_seen_at: new Date().toISOString()
    },
    "contact_id"
  );

  const payload = {
    user_id: user?.id ?? null,
    session_id: input.clientPhone,
    contact_id: input.clientPhone,
    staff_id: input.staffId,
    service_id: input.serviceId,
    starts_at: input.datetime,
    status: input.status === "cancelled" ? "cancelled" : "confirmed",
    client_name: input.clientName,
    client_phone: input.clientPhone,
    source: input.source === "manual" ? "manual" : input.source === "n8n" ? "n8n" : "sandbox"
  };

  const row =
    input.id && input.id.trim()
      ? (
          await updateRows<BookingRow>("bookings", payload, {
            id: `eq.${input.id}`
          })
        )[0] ?? null
      : await insertRow<BookingRow>("bookings", payload);

  return row ? mapBooking(row) : null;
}

export async function deleteAdminBooking(id: string) {
  await deleteRows("bookings", { id: `eq.${id}` });
}

function mergeById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export async function getSupabaseObservability(contactId?: string) {
  const eventFilters = contactId ? { contact_id: `eq.${contactId}` } : undefined;
  const [eventRows, reviewRows, bookings] = await Promise.all([
    selectRows<EventRow>(
      "event_log",
      "id,user_id,session_id,contact_id,event_type,event_subtype,source,title,detail,tone,payload,event_at,created_at",
      { filters: eventFilters, order: "event_at.desc", limit: 200 }
    ),
    selectRows<ReviewRow>(
      "dialogs_for_review",
      "id,user_id,session_id,contact_id,source,severity,trigger_reasons,user_message,agent_reply,confidence_score,tone_score,hallucination_score,raw_review,status,reviewed_by,review_note,created_at",
      { filters: eventFilters, order: "created_at.desc", limit: 80 }
    ),
    selectRows<BookingRow>(
      "bookings",
      "id,user_id,session_id,contact_id,staff_id,service_id,starts_at,status,client_name,client_phone,source",
      { filters: contactId ? { contact_id: `eq.${contactId}` } : undefined, order: "starts_at.desc", limit: 80 }
    )
  ]);

  const messagesLog = eventRows
    .filter((row) =>
      row.event_type === "incoming_message" ||
      row.event_type === "outgoing_message" ||
      row.event_type === "interim_message"
    )
    .map<MessageLogRecord>((row) => ({
      id: row.id,
      sessionId: row.session_id ?? row.contact_id ?? "",
      contactId: row.contact_id ?? "",
      direction:
        row.event_type === "incoming_message"
          ? "incoming"
          : row.event_type === "outgoing_message"
            ? "outgoing"
            : "internal",
      text: row.detail ?? row.title ?? "",
      channel: "instagram",
      provider: row.source ?? "supabase",
      payload: row.payload ?? {},
      timestamp: normalizeTimestamp(row.event_at ?? row.created_at),
      userMessage: row.event_type === "incoming_message" ? row.detail ?? "" : undefined,
      agentReply:
        row.event_type === "outgoing_message" || row.event_type === "interim_message"
          ? row.detail ?? ""
          : undefined,
      service: "instagram"
    }));

  const dialogReviews = reviewRows.map<DialogReviewRecord>((row) => ({
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

  const toolCalls = eventRows
    .filter((row) => row.event_type === "tool_call")
    .map<ToolTraceRecord>((row) => ({
      id: row.id,
      toolName: row.title ?? row.event_subtype ?? "tool_call",
      status: row.event_subtype === "error" ? "error" : "success",
      input: typeof row.payload?.input === "object" && row.payload?.input ? (row.payload.input as Record<string, unknown>) : {},
      output:
        typeof row.payload?.output === "object" && row.payload?.output
          ? (row.payload.output as Record<string, unknown>)
          : null,
      contactId: row.contact_id ?? undefined,
      timestamp: normalizeTimestamp(row.event_at ?? row.created_at)
    }));

  const escalations = eventRows
    .filter((row) => row.event_type === "escalation")
    .map<EscalationRecord>((row) => ({
      id: row.id,
      contactId: row.contact_id ?? "",
      reason: row.title ?? "Escalation",
      context: row.detail ?? "",
      timestamp: normalizeTimestamp(row.event_at ?? row.created_at)
    }));

  const clients = await getAdminClients();

  return {
    messagesLog: mergeById(messagesLog),
    dialogReviews: mergeById(dialogReviews),
    toolCalls: mergeById(toolCalls),
    escalations: mergeById(escalations),
    bookings: bookings.map(mapBooking),
    clients
  };
}

export async function getAdminSnapshotFromSupabase() {
  const [staff, services, clients, bookings] = await Promise.all([
    getAdminStaff(),
    getAdminServices(),
    getAdminClients(),
    getAdminBookings()
  ]);

  return { staff, services, clients, bookings };
}

export async function exportSupabaseSnapshot() {
  const [
    users,
    sessions,
    profiles,
    categories,
    staff,
    services,
    staffServices,
    schedules,
    exceptions,
    bookings,
    bookingServices,
    reviews,
    events
  ] = await Promise.all([
    selectRows("users", "*", { limit: 500 }),
    selectRows("sessions", "*", { limit: 500 }),
    selectRows("customer_profiles", "*", { limit: 500 }),
    selectRows("service_categories", "*", { limit: 500 }),
    selectRows("staff", "*", { limit: 500 }),
    selectRows("services", "*", { limit: 500 }),
    selectRows("staff_services", "*", { limit: 1000 }),
    selectRows("staff_schedules", "*", { limit: 1000 }),
    selectRows("schedule_exceptions", "*", { limit: 1000 }),
    selectRows("bookings", "*", { limit: 1000 }),
    selectRows("booking_services", "*", { limit: 1500 }),
    selectRows("dialogs_for_review", "*", { limit: 1000 }),
    selectRows("event_log", "*", { limit: 1500 })
  ]);

  return {
    users,
    sessions,
    customer_profiles: profiles,
    service_categories: categories,
    staff,
    services,
    staff_services: staffServices,
    staff_schedules: schedules,
    schedule_exceptions: exceptions,
    bookings,
    booking_services: bookingServices,
    dialogs_for_review: reviews,
    event_log: events
  };
}

export async function seedSupabaseSnapshot() {
  const existingCategories = await selectRows<ServiceCategoryRow>(
    "service_categories",
    "id,name,sort_order,active",
    { limit: 20 }
  );

  const categoryMap = new Map<string, string>();
  if (!existingCategories.length) {
    const cuts = await insertRow<ServiceCategoryRow>("service_categories", {
      name: "Cuts",
      sort_order: 10,
      active: true
    });
    const color = await insertRow<ServiceCategoryRow>("service_categories", {
      name: "Color",
      sort_order: 20,
      active: true
    });
    const care = await insertRow<ServiceCategoryRow>("service_categories", {
      name: "Care",
      sort_order: 30,
      active: true
    });
    [cuts, color, care].forEach((row) => {
      if (row) {
        categoryMap.set(row.name, row.id);
      }
    });
  } else {
    existingCategories.forEach((row) => categoryMap.set(row.name, row.id));
  }

  const services = await getAdminServices();
  if (!services.length) {
    await insertRow("services", {
      name: "Women's haircut",
      category_id: categoryMap.get("Cuts") ?? null,
      duration_minutes: 60,
      price_from: 900,
      active: true
    });
    await insertRow("services", {
      name: "Complex coloring",
      category_id: categoryMap.get("Color") ?? null,
      duration_minutes: 180,
      price_from: 3200,
      active: true
    });
    await insertRow("services", {
      name: "Keratin",
      category_id: categoryMap.get("Care") ?? null,
      duration_minutes: 150,
      price_from: 2800,
      active: true
    });
  }

  const staff = await getAdminStaff();
  if (!staff.length) {
    const staffA = await insertRow<StaffRow>("staff", {
      name: "Viktoriia",
      role: "Top stylist",
      active: true,
      notes: "Strong in cuts and styling."
    });
    const staffB = await insertRow<StaffRow>("staff", {
      name: "Dmytro",
      role: "Colorist",
      active: true,
      notes: "Complex coloring and keratin."
    });

    const freshServices = await selectRows<ServiceRow>(
      "services",
      "id,name,duration_minutes,price_from,active",
      { limit: 20 }
    );

    if (staffA) {
      for (const service of freshServices.slice(0, 2)) {
        await insertRow("staff_services", {
          staff_id: staffA.id,
          service_id: service.id,
          active: true
        });
      }
      for (const dayOfWeek of [1, 2, 3, 4, 5]) {
        await insertRow("staff_schedules", {
          staff_id: staffA.id,
          day_of_week: dayOfWeek,
          start_time: "10:00:00",
          end_time: "18:00:00",
          is_working: true
        });
      }
    }

    if (staffB) {
      for (const service of freshServices.slice(1)) {
        await insertRow("staff_services", {
          staff_id: staffB.id,
          service_id: service.id,
          active: true
        });
      }
      for (const dayOfWeek of [2, 3, 4, 5, 6]) {
        await insertRow("staff_schedules", {
          staff_id: staffB.id,
          day_of_week: dayOfWeek,
          start_time: "11:00:00",
          end_time: "19:00:00",
          is_working: true
        });
      }
    }
  }

  return getAdminSnapshotFromSupabase();
}

export async function listActiveStaff(serviceId?: string) {
  const [staffRows, links] = await Promise.all([
    selectRows<StaffRow>("staff", "id,name,role,active,notes", {
      filters: { active: "eq.true" },
      order: "name.asc",
      limit: 200
    }),
    selectRows<StaffServiceRow>("staff_services", "staff_id,service_id,seance_length,price_override,active", {
      filters: serviceId ? { service_id: `eq.${serviceId}` } : undefined,
      limit: 500
    })
  ]);

  const filtered = serviceId
    ? staffRows.filter((row) =>
        links.some((link) => link.staff_id === row.id && link.service_id === serviceId && link.active !== false)
      )
    : staffRows;

  return filtered;
}

export async function listActiveServices(staffId?: string) {
  const [services, links] = await Promise.all([
    selectRows<ServiceRow>("services", "id,category_id,name,duration_minutes,price_from,active", {
      filters: { active: "eq.true" },
      order: "name.asc",
      limit: 300
    }),
    selectRows<StaffServiceRow>("staff_services", "staff_id,service_id,seance_length,price_override,active", {
      filters: staffId ? { staff_id: `eq.${staffId}` } : undefined,
      limit: 500
    })
  ]);

  const filtered = staffId
    ? services.filter((row) =>
        links.some((link) => link.staff_id === staffId && link.service_id === row.id && link.active !== false)
      )
    : services;

  return filtered.map((row) => ({
    ...row,
    staff_link: staffId
      ? links.find((link) => link.staff_id === staffId && link.service_id === row.id) ?? null
      : null
  }));
}

function parseTimeOnDate(date: string, time: string) {
  return Date.parse(`${date}T${time}`);
}

function overlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export async function listAvailableSlots(input: {
  staffId: string;
  serviceId: string;
  date: string;
}) {
  const [serviceLinks, services, schedules, exceptions, bookings] = await Promise.all([
    selectRows<StaffServiceRow>(
      "staff_services",
      "staff_id,service_id,seance_length,price_override,active",
      {
        filters: {
          staff_id: `eq.${input.staffId}`,
          service_id: `eq.${input.serviceId}`
        },
        limit: 1
      }
    ),
    selectRows<ServiceRow>("services", "id,name,duration_minutes,price_from", {
      filters: { id: `eq.${input.serviceId}` },
      limit: 1
    }),
    selectRows<ScheduleRow>(
      "staff_schedules",
      "id,staff_id,day_of_week,start_time,end_time,is_working,valid_from,valid_to",
      {
        filters: {
          staff_id: `eq.${input.staffId}`,
          day_of_week: `eq.${new Date(`${input.date}T00:00:00`).getDay()}`
        },
        limit: 50
      }
    ),
    selectRows<ExceptionRow>(
      "schedule_exceptions",
      "id,staff_id,exception_date,start_time,end_time,exception_type,label,notes",
      {
        filters: {
          staff_id: `eq.${input.staffId}`,
          exception_date: `eq.${input.date}`
        },
        limit: 50
      }
    ),
    selectRows<BookingRow>(
      "bookings",
      "id,staff_id,starts_at,ends_at,status",
      {
        filters: {
          staff_id: `eq.${input.staffId}`,
          starts_at: `gte.${input.date}T00:00:00`,
          status: "in.(pending,confirmed)"
        },
        order: "starts_at.asc",
        limit: 100
      }
    )
  ]);

  const service = services[0];
  const link = serviceLinks[0];
  const durationMinutes = link?.seance_length ?? service?.duration_minutes ?? 60;
  const stepMinutes = 30;
  const slots: Array<{ datetime: string; staff_id: string; service_id: string }> = [];

  for (const schedule of schedules.filter((item) => item.is_working !== false)) {
    if (schedule.valid_from && schedule.valid_from > input.date) continue;
    if (schedule.valid_to && schedule.valid_to < input.date) continue;

    const windowStart = parseTimeOnDate(input.date, schedule.start_time);
    const windowEnd = parseTimeOnDate(input.date, schedule.end_time);

    for (
      let cursor = windowStart;
      cursor + durationMinutes * 60_000 <= windowEnd;
      cursor += stepMinutes * 60_000
    ) {
      const candidateStart = cursor;
      const candidateEnd = cursor + durationMinutes * 60_000;

      const blockedByException = exceptions.some((item) => {
        const type = item.exception_type ?? "blocked";
        if (type === "custom_open") {
          return false;
        }

        if (!item.start_time || !item.end_time) {
          return true;
        }

        return overlap(
          candidateStart,
          candidateEnd,
          parseTimeOnDate(input.date, item.start_time),
          parseTimeOnDate(input.date, item.end_time)
        );
      });

      if (blockedByException) {
        continue;
      }

      const reOpened = exceptions.some((item) => {
        if ((item.exception_type ?? "blocked") !== "custom_open" || !item.start_time || !item.end_time) {
          return false;
        }

        return overlap(
          candidateStart,
          candidateEnd,
          parseTimeOnDate(input.date, item.start_time),
          parseTimeOnDate(input.date, item.end_time)
        );
      });

      const occupied = bookings.some((item) => {
        const startsAt = Date.parse(item.starts_at);
        const endsAt = item.ends_at
          ? Date.parse(item.ends_at)
          : startsAt + durationMinutes * 60_000;
        return overlap(candidateStart, candidateEnd, startsAt, endsAt);
      });

      if (occupied) {
        continue;
      }

      if (reOpened || candidateStart >= windowStart) {
        slots.push({
          datetime: new Date(candidateStart).toISOString(),
          staff_id: input.staffId,
          service_id: input.serviceId
        });
      }
    }
  }

  return slots;
}

export async function createBookingFromTool(input: {
  staffId: string;
  serviceId: string;
  datetime: string;
  clientName: string;
  clientPhone: string;
  contactId?: string;
}) {
  const available = await listAvailableSlots({
    staffId: input.staffId,
    serviceId: input.serviceId,
    date: input.datetime.slice(0, 10)
  });

  const slotFree = available.some((item) => item.datetime === new Date(input.datetime).toISOString());
  if (!slotFree) {
    return {
      success: false as const,
      error: "slot_occupied"
    };
  }

  const booking = await upsertAdminBooking({
    staffId: input.staffId,
    serviceId: input.serviceId,
    datetime: new Date(input.datetime).toISOString(),
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    status: "confirmed",
    source: input.contactId?.startsWith("SANDBOX_") ? "sandbox" : "n8n"
  });

  if (!booking) {
    return {
      success: false as const,
      error: "booking_failed"
    };
  }

  await insertRow("booking_services", {
    booking_id: booking.id,
    service_id: booking.serviceId,
    staff_id: booking.staffId,
    sort_order: 0
  });

  return {
    success: true as const,
    data: booking
  };
}

export async function cancelBookingById(bookingId: string) {
  const rows = await updateRows<BookingRow>(
    "bookings",
    { status: "cancelled" },
    { id: `eq.${bookingId}` }
  );

  return rows.length > 0;
}

export async function estimatePrice(input: { staffId: string; serviceId: string }) {
  const [serviceRows, linkRows] = await Promise.all([
    selectRows<ServiceRow>("services", "id,name,price_from,duration_minutes", {
      filters: { id: `eq.${input.serviceId}` },
      limit: 1
    }),
    selectRows<StaffServiceRow>("staff_services", "staff_id,service_id,price_override,seance_length,active", {
      filters: {
        staff_id: `eq.${input.staffId}`,
        service_id: `eq.${input.serviceId}`
      },
      limit: 1
    })
  ]);

  const service = serviceRows[0];
  if (!service) {
    return null;
  }

  const link = linkRows[0];

  return {
    service_id: service.id,
    staff_id: input.staffId,
    price_from: Number(link?.price_override ?? service.price_from ?? 0),
    duration_minutes: Number(link?.seance_length ?? service.duration_minutes ?? 60)
  };
}

export async function findClient(input: { phone?: string; name?: string }) {
  const users = await selectRows<UserRow>("users", "id,contact_id,name,phone", {
    limit: 400
  });
  const bookings = await selectRows<BookingRow>("bookings", "id,user_id,status", { limit: 800 });
  const profiles = await selectRows<ProfileRow>("customer_profiles", "user_id,contact_id,summary,profile_json", {
    limit: 400
  });

  const normalizedPhone = input.phone?.trim().toLowerCase();
  const normalizedName = input.name?.trim().toLowerCase();

  const user = users.find((item) => {
    if (normalizedPhone && item.phone?.trim().toLowerCase() === normalizedPhone) {
      return true;
    }
    if (normalizedName && item.name?.trim().toLowerCase().includes(normalizedName)) {
      return true;
    }
    return false;
  });

  if (!user) {
    return null;
  }

  const profile = profiles.find((item) => item.user_id === user.id || item.contact_id === user.contact_id);
  const visitCount = bookings.filter(
    (item) =>
      item.user_id === user.id &&
      (item.status === "confirmed" || item.status === "completed")
  ).length;

  return {
    id: user.id,
    name: user.name ?? user.contact_id,
    phone: user.phone ?? "",
    visitCount,
    tags: Array.isArray(profile?.profile_json?.tags)
      ? profile?.profile_json?.tags.map((item) => String(item))
      : [],
    notes: profile?.summary ?? ""
  };
}

export async function createEscalation(input: {
  contactId: string;
  reason: string;
  context: string;
}) {
  const contextRow = await ensureConversationContext({
    contactId: input.contactId
  });

  const row = await logEvent({
    userId: contextRow.userId,
    sessionId: contextRow.sessionId,
    contactId: input.contactId,
    eventType: "escalation",
    eventSubtype: "requested",
    source: "n8n",
    title: input.reason,
    detail: input.context,
    tone: "red",
    payload: {
      reason: input.reason,
      context: input.context
    }
  });

  return {
    id: row?.id ?? crypto.randomUUID(),
    contactId: input.contactId,
    reason: input.reason,
    context: input.context,
    timestamp: normalizeTimestamp(row?.event_at ?? row?.created_at)
  };
}

export async function getBookingById(id: string) {
  const rows = await selectRows<BookingRow>(
    "bookings",
    "id,user_id,session_id,contact_id,staff_id,service_id,starts_at,ends_at,status,client_name,client_phone,source,metadata",
    { filters: { id: `eq.${id}` }, limit: 1 }
  );
  return rows[0] ? mapBooking(rows[0]) : null;
}

export async function rescheduleBooking(input: {
  id: string;
  datetime: string;
  staffId?: string;
}) {
  const payload: Record<string, string> = {
    starts_at: new Date(input.datetime).toISOString()
  };
  if (input.staffId) payload.staff_id = input.staffId;

  const rows = await updateRows<BookingRow>("bookings", payload, { id: `eq.${input.id}` });
  return rows[0] ? mapBooking(rows[0]) : null;
}

export async function createClientFromTool(input: { name: string; phone: string; notes?: string }) {
  const user = await upsertAdminClient({
    name: input.name,
    phone: input.phone,
    notes: input.notes
  });

  if (!user) return null;

  const bookings = await selectRows<BookingRow>("bookings", "id,user_id,status", {
    filters: { user_id: `eq.${user.id}` },
    limit: 200
  });

  const visitCount = bookings.filter(
    (item) => item.status === "confirmed" || item.status === "completed"
  ).length;

  return {
    id: user.id,
    name: user.name ?? input.name,
    phone: user.phone ?? input.phone,
    visitCount,
    tags: [] as string[],
    notes: input.notes ?? ""
  };
}
