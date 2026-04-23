import { defaultClients, defaultServices, defaultStaff } from "@/lib/seed";
import {
  AdminSnapshot,
  BookingRecord,
  ClientRecord,
  DialogReviewRecord,
  EscalationRecord,
  ObservabilityEventRecord,
  MessageLogRecord,
  ObservabilitySnapshot,
  SandboxMessage,
  SendMessageRequest,
  ServiceItem,
  StaffMember,
  ToolTraceRecord
} from "@/lib/types";

type SandboxStoreState = {
  messagesByContact: Record<string, SandboxMessage[]>;
  staff: StaffMember[];
  services: ServiceItem[];
  clients: ClientRecord[];
  bookings: BookingRecord[];
  escalationsByContact: Record<string, EscalationRecord[]>;
  toolCalls: ToolTraceRecord[];
  messagesLog: MessageLogRecord[];
  dialogReviews: DialogReviewRecord[];
};

const globalKey = "__vangel_sandbox_store__";

function cloneSnapshot(): AdminSnapshot {
  return {
    staff: structuredClone(defaultStaff),
    services: structuredClone(defaultServices),
    clients: structuredClone(defaultClients),
    bookings: []
  };
}

function getState(): SandboxStoreState {
  const globalScope = globalThis as typeof globalThis & {
    [globalKey]?: SandboxStoreState;
  };

  if (!globalScope[globalKey]) {
    const snapshot = cloneSnapshot();
    globalScope[globalKey] = {
      messagesByContact: {},
      staff: snapshot.staff,
      services: snapshot.services,
      clients: snapshot.clients,
      bookings: snapshot.bookings,
      escalationsByContact: {},
      toolCalls: [],
      messagesLog: [],
      dialogReviews: []
    };
  }

  return globalScope[globalKey] as SandboxStoreState;
}

function createMessage(
  author: SandboxMessage["author"],
  text: string,
  timestamp = Date.now()
): SandboxMessage {
  return {
    id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    author,
    text,
    timestamp
  };
}

export function listMessages(contactId: string, since?: number) {
  const items = getState().messagesByContact[contactId] ?? [];

  if (!since) {
    return items;
  }

  return items.filter((message) => message.timestamp > since);
}

export function appendClientMessage(input: SendMessageRequest) {
  const state = getState();
  const message = createMessage("client", input.text);
  const existing = state.messagesByContact[input.contactId] ?? [];
  state.messagesByContact[input.contactId] = [...existing, message];
  logMessage({
    sessionId: input.contactId,
    contactId: input.contactId,
    direction: "incoming",
    text: input.text,
    channel: "instagram",
    provider: "sandbox",
    payload: {
      persona: input.persona,
      username: input.contactUsername
    }
  });
  return message;
}

export function appendSalonMessage(contactId: string, text: string) {
  const state = getState();
  const message = createMessage("salon", text);
  const existing = state.messagesByContact[contactId] ?? [];
  state.messagesByContact[contactId] = [...existing, message];
  logMessage({
    sessionId: contactId,
    contactId,
    direction: "outgoing",
    text,
    channel: "instagram",
    provider: "sandbox",
    payload: {}
  });
  return message;
}

export function resetMessages(contactId: string) {
  getState().messagesByContact[contactId] = [];
}

export function buildLocalReply(input: SendMessageRequest) {
  const serviceNames = getState()
    .services.filter((service) => service.active)
    .slice(0, 3)
    .map((service) => service.name.toLowerCase());

  const personaPrefix =
    input.persona === "vip"
      ? "Для вас підберемо найкомфортніший варіант."
      : input.persona === "complaint"
        ? "Бачу запит на чутливий сценарій, тримаю тон максимально акуратним."
        : "Поки n8n ще не підключений, відповідаю з локального sandbox.";

  return `${personaPrefix} Отримали: "${input.text}". Для тесту можемо далі провести сценарій через ${serviceNames.join(
    ", "
  )}.`;
}

export function getAdminSnapshot(): AdminSnapshot {
  const state = getState();
  return {
    staff: structuredClone(state.staff),
    services: structuredClone(state.services),
    clients: structuredClone(state.clients),
    bookings: structuredClone(state.bookings)
  };
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function logToolCall(input: {
  toolName: string;
  status: "success" | "error";
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  contactId?: string;
}) {
  const record: ToolTraceRecord = {
    id: createId("tool"),
    toolName: input.toolName,
    status: input.status,
    input: input.input,
    output: input.output,
    contactId: input.contactId,
    timestamp: Date.now()
  };
  getState().toolCalls.unshift(record);
  getState().toolCalls = getState().toolCalls.slice(0, 100);
  return record;
}

export function logMessage(input: Omit<MessageLogRecord, "id" | "timestamp">) {
  const record: MessageLogRecord = {
    id: createId("msglog"),
    timestamp: Date.now(),
    ...input
  };
  getState().messagesLog.unshift(record);
  getState().messagesLog = getState().messagesLog.slice(0, 200);
  return record;
}

function computeReviewSeverity(userMessage: string, agentReply: string): DialogReviewRecord {
  const source = `${userMessage} ${agentReply}`.toLowerCase();
  const reasons: string[] = [];
  let severity: "green" | "yellow" | "red" = "green";
  let confidenceScore = 0.92;
  let toneScore = 0.94;
  let hallucinationScore = 0.95;

  if (/(скарг|погано|жах|не влаштовує|проблем)/.test(source)) {
    severity = "yellow";
    reasons.push("complaint_signal");
    toneScore = 0.68;
  }

  if (/(ескалац|🚨|не можу|не знаю|критич)/.test(source)) {
    severity = "red";
    reasons.push("escalation_signal");
    confidenceScore = 0.45;
    hallucinationScore = 0.7;
  }

  if (/(бронювання підтверджено|вільні слоти|записали|дякую)/.test(source) && severity === "green") {
    reasons.push("healthy_flow");
  }

  return {
    id: createId("review"),
    sessionId: "",
    contactId: "",
    severity,
    triggerReasons: reasons.length ? reasons : ["normal_flow"],
    userMessage,
    agentReply,
    confidenceScore,
    toneScore,
    hallucinationScore,
    timestamp: Date.now()
  };
}

export function logDialogReview(input: {
  sessionId: string;
  contactId: string;
  userMessage: string;
  agentReply: string;
}) {
  const review = computeReviewSeverity(input.userMessage, input.agentReply);
  review.sessionId = input.sessionId;
  review.contactId = input.contactId;
  getState().dialogReviews.unshift(review);
  getState().dialogReviews = getState().dialogReviews.slice(0, 200);
  return review;
}

export function getObservabilitySnapshot(contactId?: string): ObservabilitySnapshot {
  const state = getState();
  const escalations = Object.values(state.escalationsByContact).flat();

  const matchContact = <T extends { contactId?: string }>(items: T[]) =>
    contactId ? items.filter((item) => item.contactId === contactId) : items;

  const toolCalls = matchContact(state.toolCalls);
  const messagesLog = contactId
    ? state.messagesLog.filter((item) => item.contactId === contactId)
    : state.messagesLog;
  const dialogReviews = contactId
    ? state.dialogReviews.filter((item) => item.contactId === contactId)
    : state.dialogReviews;
  const scopedEscalations = contactId
    ? escalations.filter((item) => item.contactId === contactId)
    : escalations;

  const events: ObservabilityEventRecord[] = [
    ...messagesLog.map((item) => ({
      id: `msg-${item.id}`,
      kind: "message" as const,
      contactId: item.contactId,
      timestamp: item.timestamp,
      title: `${item.direction} ${item.service ?? item.channel}`,
      detail: item.agentReply ?? item.userMessage ?? item.text,
      tone: "neutral" as const,
      meta: item.provider
    })),
    ...toolCalls.map((item) => ({
      id: `tool-${item.id}`,
      kind: "tool" as const,
      contactId: item.contactId,
      timestamp: item.timestamp,
      title: item.toolName,
      detail: item.status === "error" ? "Tool call failed" : "Tool call completed",
      tone: item.status === "error" ? ("red" as const) : ("neutral" as const),
      meta: item.status
    })),
    ...dialogReviews.map((item) => ({
      id: `review-${item.id}`,
      kind: "review" as const,
      contactId: item.contactId,
      timestamp: item.timestamp,
      title: item.severity.toUpperCase(),
      detail: item.triggerReasons.join(", "),
      tone: item.severity,
      meta: `confidence ${item.confidenceScore.toFixed(2)}`
    })),
    ...scopedEscalations.map((item) => ({
      id: `escalation-${item.id}`,
      kind: "escalation" as const,
      contactId: item.contactId,
      timestamp: item.timestamp,
      title: item.reason,
      detail: item.context || "Escalation requested",
      tone: "red" as const
    }))
  ]
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 200);

  return {
    toolCalls,
    messagesLog,
    dialogReviews,
    clients: structuredClone(state.clients),
    bookings: structuredClone(state.bookings),
    escalations: scopedEscalations,
    events,
    sources: {
      messagesLog: "local",
      dialogReviews: "local"
    }
  };
}

export function seedAdminSnapshot() {
  const state = getState();
  const snapshot = cloneSnapshot();
  state.staff = snapshot.staff;
  state.services = snapshot.services;
  state.clients = snapshot.clients;
  state.bookings = snapshot.bookings;
  return getAdminSnapshot();
}

export function upsertStaffMember(item: Partial<StaffMember> & Pick<StaffMember, "name">) {
  const state = getState();
  const nextItem: StaffMember = {
    id: item.id ?? `staff_${Date.now()}`,
    role: item.role ?? "Master",
    active: item.active ?? true,
    notes: item.notes ?? "",
    serviceIds: item.serviceIds ?? [],
    name: item.name
  };
  const index = state.staff.findIndex((staff) => staff.id === nextItem.id);

  if (index >= 0) {
    state.staff[index] = nextItem;
  } else {
    state.staff.unshift(nextItem);
  }

  return nextItem;
}

export function deleteStaffMember(id: string) {
  const state = getState();
  state.staff = state.staff.filter((item) => item.id !== id);
}

export function upsertServiceItem(item: Partial<ServiceItem> & Pick<ServiceItem, "name">) {
  const state = getState();
  const nextItem: ServiceItem = {
    id: item.id ?? `svc_${Date.now()}`,
    durationMinutes: item.durationMinutes ?? 60,
    priceFrom: item.priceFrom ?? 0,
    active: item.active ?? true,
    name: item.name
  };
  const index = state.services.findIndex((service) => service.id === nextItem.id);

  if (index >= 0) {
    state.services[index] = nextItem;
  } else {
    state.services.unshift(nextItem);
  }

  return nextItem;
}

export function deleteServiceItem(id: string) {
  const state = getState();
  state.services = state.services.filter((item) => item.id !== id);
  state.staff = state.staff.map((staff) => ({
    ...staff,
    serviceIds: staff.serviceIds.filter((serviceId) => serviceId !== id)
  }));
  state.bookings = state.bookings.filter((booking) => booking.serviceId !== id);
}

export function listActiveServices(staffId?: string) {
  const state = getState();
  const activeServiceIds = staffId
    ? new Set(
        state.staff
          .filter((staff) => staff.active && staff.id === staffId)
          .flatMap((staff) => staff.serviceIds)
      )
    : null;

  return state.services.filter(
    (service) => service.active && (!activeServiceIds || activeServiceIds.has(service.id))
  );
}

export function listActiveStaff(serviceId?: string) {
  const state = getState();
  return state.staff.filter(
    (staff) =>
      staff.active &&
      (!serviceId || staff.serviceIds.includes(serviceId))
  );
}

export function findClient(params: { phone?: string; name?: string }) {
  const state = getState();
  const phone = params.phone?.trim();
  const name = params.name?.trim().toLowerCase();

  return (
    state.clients.find((client) => (phone ? client.phone === phone : false)) ??
    state.clients.find((client) => (name ? client.name.toLowerCase() === name : false)) ??
    null
  );
}

export function upsertClientRecord(input: {
  name: string;
  phone: string;
}) {
  const state = getState();
  const existing = state.clients.find((client) => client.phone === input.phone);

  if (existing) {
    existing.name = input.name;
    existing.visitCount += 1;
    return existing;
  }

  const nextClient: ClientRecord = {
    id: `client_${Date.now()}`,
    name: input.name,
    phone: input.phone,
    visitCount: 1,
    notes: "",
    tags: []
  };
  state.clients.unshift(nextClient);
  return nextClient;
}

function isSlotOccupied(staffId: string, datetime: string) {
  return getState().bookings.some(
    (booking) =>
      booking.staffId === staffId &&
      booking.datetime === datetime &&
      booking.status === "confirmed"
  );
}

export function listAvailableSlots(params: {
  staffId: string;
  serviceId: string;
  date: string;
}) {
  const state = getState();
  const staff = state.staff.find((item) => item.id === params.staffId);
  const service = state.services.find((item) => item.id === params.serviceId);

  if (!staff || !staff.active || !service || !service.active) {
    return [];
  }

  const durationSlots = Math.max(1, Math.ceil(service.durationMinutes / 30));
  const candidates = [
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00"
  ];

  return candidates
    .filter((time, index) => index + durationSlots <= candidates.length)
    .filter((time) => !isSlotOccupied(params.staffId, `${params.date}T${time}:00+03:00`))
    .map((time) => ({
      time,
      datetime: `${params.date}T${time}:00+03:00`
    }));
}

export function createBooking(input: {
  staffId: string;
  serviceId: string;
  datetime: string;
  clientName: string;
  clientPhone: string;
  source?: "agent" | "admin";
}) {
  const state = getState();

  if (isSlotOccupied(input.staffId, input.datetime)) {
    return {
      success: false as const,
      error: "slot_occupied"
    };
  }

  upsertClientRecord({
    name: input.clientName,
    phone: input.clientPhone
  });

  const booking: BookingRecord = {
    id: `SBX-BOOK-${Date.now()}`,
    staffId: input.staffId,
    serviceId: input.serviceId,
    datetime: input.datetime,
    status: "confirmed",
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    source: input.source ?? "agent"
  };

  state.bookings.unshift(booking);
  logMessage({
    sessionId: input.clientPhone,
    contactId: input.clientPhone,
    direction: "internal",
    text: `Booking created for ${input.clientName}`,
    channel: "sandbox",
    provider: "mock-altegio",
    payload: booking as unknown as Record<string, unknown>
  });

  return {
    success: true as const,
    data: booking
  };
}

export function cancelBooking(bookingId: string) {
  const booking = getState().bookings.find((item) => item.id === bookingId);

  if (!booking) {
    return false;
  }

  booking.status = "cancelled";
  return true;
}

export function estimatePrice(params: { staffId: string; serviceId: string }) {
  const state = getState();
  const staff = state.staff.find((item) => item.id === params.staffId);
  const service = state.services.find((item) => item.id === params.serviceId);

  if (!staff || !service) {
    return null;
  }

  const multiplier =
    staff.role.toLowerCase().includes("top") ? 1.15 : staff.role.toLowerCase().includes("senior") ? 1.1 : 1;

  return {
    staffId: staff.id,
    serviceId: service.id,
    price: Math.round(service.priceFrom * multiplier)
  };
}

export function createEscalation(input: {
  contactId: string;
  reason: string;
  context: string;
}) {
  const state = getState();
  const escalation: EscalationRecord = {
    id: `escalation_${Date.now()}`,
    contactId: input.contactId,
    reason: input.reason,
    context: input.context,
    timestamp: Date.now()
  };
  const current = state.escalationsByContact[input.contactId] ?? [];
  state.escalationsByContact[input.contactId] = [escalation, ...current];

  appendSalonMessage(
    input.contactId,
    `🚨 Ескалація: ${input.reason}${input.context ? ` — ${input.context}` : ""}`
  );
  logMessage({
    sessionId: input.contactId,
    contactId: input.contactId,
    direction: "internal",
    text: `Escalation created: ${input.reason}`,
    channel: "sandbox",
    provider: "mock-altegio",
    payload: escalation as unknown as Record<string, unknown>
  });

  return escalation;
}
