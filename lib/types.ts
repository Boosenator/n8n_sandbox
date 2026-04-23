export type PersonaOption = "new_client" | "returning" | "vip" | "complaint";

export type MessageAuthor = "client" | "salon" | "system";

export type SandboxMessage = {
  id: string;
  author: MessageAuthor;
  text: string;
  timestamp: number;
};

export type SessionPayload = {
  webhookUrl: string;
  contactId: string;
  contactName: string;
  contactUsername: string;
  persona: PersonaOption;
  debugPayload: boolean;
};

export type SendMessageRequest = SessionPayload & {
  text: string;
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  notes: string;
  serviceIds: string[];
};

export type ServiceItem = {
  id: string;
  name: string;
  durationMinutes: number;
  priceFrom: number;
  active: boolean;
};

export type ClientRecord = {
  id: string;
  name: string;
  phone: string;
  visitCount: number;
  notes: string;
  tags: string[];
};

export type BookingRecord = {
  id: string;
  staffId: string;
  serviceId: string;
  datetime: string;
  status: "confirmed" | "cancelled";
  clientName: string;
  clientPhone: string;
  source: "agent" | "admin";
};

export type EscalationRecord = {
  id: string;
  contactId: string;
  reason: string;
  context: string;
  timestamp: number;
};

export type ToolTraceRecord = {
  id: string;
  toolName: string;
  status: "success" | "error";
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  contactId?: string;
  timestamp: number;
};

export type MessageLogRecord = {
  id: string;
  sessionId: string;
  contactId: string;
  direction: "incoming" | "outgoing" | "internal";
  text: string;
  channel: string;
  provider: string;
  payload: Record<string, unknown>;
  timestamp: number;
};

export type ReviewSeverity = "green" | "yellow" | "red";

export type DialogReviewRecord = {
  id: string;
  sessionId: string;
  contactId: string;
  severity: ReviewSeverity;
  triggerReasons: string[];
  userMessage: string;
  agentReply: string;
  confidenceScore: number;
  toneScore: number;
  hallucinationScore: number;
  timestamp: number;
};

export type ObservabilitySnapshot = {
  toolCalls: ToolTraceRecord[];
  messagesLog: MessageLogRecord[];
  dialogReviews: DialogReviewRecord[];
  clients: ClientRecord[];
  bookings: BookingRecord[];
  escalations: EscalationRecord[];
};

export type AdminSnapshot = {
  staff: StaffMember[];
  services: ServiceItem[];
  clients: ClientRecord[];
  bookings: BookingRecord[];
};
