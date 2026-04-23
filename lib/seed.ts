import { ServiceItem, StaffMember } from "@/lib/types";

export const defaultServices: ServiceItem[] = [
  {
    id: "svc_haircut",
    name: "Жіноча стрижка",
    durationMinutes: 60,
    priceFrom: 900,
    active: true
  },
  {
    id: "svc_coloring",
    name: "Складне фарбування",
    durationMinutes: 180,
    priceFrom: 3200,
    active: true
  },
  {
    id: "svc_keratin",
    name: "Кератин",
    durationMinutes: 150,
    priceFrom: 2800,
    active: true
  },
  {
    id: "svc_style",
    name: "Укладка",
    durationMinutes: 45,
    priceFrom: 700,
    active: true
  }
];

export const defaultStaff: StaffMember[] = [
  {
    id: "staff_victoria",
    name: "Вікторія",
    role: "Top stylist",
    active: true,
    notes: "Сильна в стрижках та укладках.",
    serviceIds: ["svc_haircut", "svc_style"]
  },
  {
    id: "staff_dmytro",
    name: "Дмитро",
    role: "Colorist",
    active: true,
    notes: "Складні фарбування та кератин.",
    serviceIds: ["svc_coloring", "svc_keratin"]
  },
  {
    id: "staff_valeriia",
    name: "Валерія",
    role: "Senior master",
    active: true,
    notes: "Працює з VIP-клієнтами.",
    serviceIds: ["svc_haircut", "svc_coloring", "svc_keratin"]
  }
];
