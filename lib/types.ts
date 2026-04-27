export type PersonaOption = "new_client" | "returning" | "vip" | "complaint";

export type MessageAuthor = "client" | "salon" | "system";

export type SandboxMessage = {
  id: string;
  author: MessageAuthor;
  text: string;
  timestamp: number;
};

export type WebhookEnv = "test" | "prod";

export type SessionPayload = {
  webhookUrlTest: string;
  webhookUrlProd: string;
  webhookEnv: WebhookEnv;
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
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  clientName: string;
  clientPhone: string;
  source: "sandbox" | "altegio" | "manual" | "n8n";
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
  userMessage?: string;
  agentReply?: string;
  service?: string;
  deliveryStatus?: string;
  httpStatus?: number;
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

export type ObservabilityEventKind = "message" | "tool" | "review" | "escalation";

export type ObservabilityEventRecord = {
  id: string;
  kind: ObservabilityEventKind;
  contactId?: string;
  timestamp: number;
  title: string;
  detail: string;
  tone?: ReviewSeverity | "neutral";
  meta?: string;
};

export type SnapshotSource = "local" | "supabase" | "merged";

export type ObservabilitySnapshot = {
  toolCalls: ToolTraceRecord[];
  messagesLog: MessageLogRecord[];
  dialogReviews: DialogReviewRecord[];
  clients: ClientRecord[];
  bookings: BookingRecord[];
  escalations: EscalationRecord[];
  events: ObservabilityEventRecord[];
  sources: {
    messagesLog: SnapshotSource;
    dialogReviews: SnapshotSource;
  };
};

export type AdminSnapshot = {
  staff: StaffMember[];
  services: ServiceItem[];
  clients: ClientRecord[];
  bookings: BookingRecord[];
};
