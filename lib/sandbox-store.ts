import { defaultServices, defaultStaff } from "@/lib/seed";
import {
  AdminSnapshot,
  SandboxMessage,
  SendMessageRequest,
  ServiceItem,
  StaffMember
} from "@/lib/types";

type SandboxStoreState = {
  messagesByContact: Record<string, SandboxMessage[]>;
  staff: StaffMember[];
  services: ServiceItem[];
};

const globalKey = "__vangel_sandbox_store__";

function cloneSnapshot(): AdminSnapshot {
  return {
    staff: structuredClone(defaultStaff),
    services: structuredClone(defaultServices)
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
      services: snapshot.services
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
  return message;
}

export function appendSalonMessage(contactId: string, text: string) {
  const state = getState();
  const message = createMessage("salon", text);
  const existing = state.messagesByContact[contactId] ?? [];
  state.messagesByContact[contactId] = [...existing, message];
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
    services: structuredClone(state.services)
  };
}

export function seedAdminSnapshot() {
  const state = getState();
  const snapshot = cloneSnapshot();
  state.staff = snapshot.staff;
  state.services = snapshot.services;
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
}
