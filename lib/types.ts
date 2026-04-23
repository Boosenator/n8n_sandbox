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

export type AdminSnapshot = {
  staff: StaffMember[];
  services: ServiceItem[];
};
