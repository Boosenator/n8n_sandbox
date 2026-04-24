"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookingRecord,
  ClientRecord,
  DialogReviewRecord,
  EscalationRecord,
  MessageLogRecord,
  ObservabilityEventRecord,
  ServiceItem,
  SnapshotSource,
  StaffMember,
  ToolTraceRecord
} from "@/lib/types";

type AdminTab =
  | "overview"
  | "staff"
  | "services"
  | "clients"
  | "bookings"
  | "observability";

const navGroups: Array<{
  title: string;
  items: Array<{ id: AdminTab; label: string; hint: string }>;
}> = [
  {
    title: "Control",
    items: [
      { id: "overview", label: "Dashboard", hint: "Status and progress" },
      { id: "observability", label: "Observability", hint: "Signals and logs" }
    ]
  },
  {
    title: "Sandbox Data",
    items: [
      { id: "staff", label: "Staff", hint: "Masters and roles" },
      { id: "services", label: "Services", hint: "Catalog and prices" },
      { id: "clients", label: "Clients", hint: "Profiles and tags" },
      { id: "bookings", label: "Bookings", hint: "Manual bookings" }
    ]
  }
];

const doneItems = [
  "Chat sandbox with webhook send and polling",
  "Mock Altegio tools for n8n",
  "DB-backed dialog signals with fallback",
  "Compact logs and traces in the sandbox UI"
];

const nextItems = [
  "State-aware session control for paused and in-progress dialogs",
  "Supabase-backed clients and bookings read model",
  "Filters by contact, severity and tool"
];

const emptyStaffForm = {
  id: "",
  name: "",
  role: "",
  notes: "",
  active: true,
  serviceIds: [] as string[]
};

const emptyServiceForm = {
  id: "",
  name: "",
  durationMinutes: 60,
  priceFrom: 0,
  active: true
};

const emptyClientForm = {
  id: "",
  name: "",
  phone: "",
  visitCount: 0,
  notes: "",
  tagsText: ""
};

const emptyBookingForm = {
  id: "",
  clientName: "",
  clientPhone: "",
  staffId: "",
  serviceId: "",
  datetime: "",
  status: "confirmed" as BookingRecord["status"],
  source: "admin" as BookingRecord["source"]
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatShortDate(value: string) {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toneClass(tone?: "green" | "yellow" | "red" | "neutral") {
  if (tone === "green" || tone === "yellow" || tone === "red") {
    return tone;
  }

  return "neutral";
}

export function AdminOverview() {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [bookingForm, setBookingForm] = useState(emptyBookingForm);
  const [toolCalls, setToolCalls] = useState<ToolTraceRecord[]>([]);
  const [messagesLog, setMessagesLog] = useState<MessageLogRecord[]>([]);
  const [events, setEvents] = useState<ObservabilityEventRecord[]>([]);
  const [dialogReviews, setDialogReviews] = useState<DialogReviewRecord[]>([]);
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [sources, setSources] = useState<{
    messagesLog: SnapshotSource;
    dialogReviews: SnapshotSource;
  }>({
    messagesLog: "local",
    dialogReviews: "local"
  });

  const serviceOptions = useMemo(
    () => services.map((service) => ({ id: service.id, label: service.name })),
    [services]
  );

  const staffOptions = useMemo(
    () => staff.map((item) => ({ id: item.id, label: item.name })),
    [staff]
  );

  const stats = useMemo(
    () => [
      { label: "Staff", value: staff.length, diff: `${staff.filter((item) => item.active).length} active` },
      { label: "Services", value: services.length, diff: `${services.filter((item) => item.active).length} active` },
      { label: "Clients", value: clients.length, diff: `${clients.reduce((sum, item) => sum + item.visitCount, 0)} visits` },
      { label: "Bookings", value: bookings.length, diff: `${bookings.filter((item) => item.status === "confirmed").length} confirmed` }
    ],
    [bookings, clients, services, staff]
  );

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [
        staffResponse,
        servicesResponse,
        clientsResponse,
        bookingsResponse,
        observabilityResponse
      ] = await Promise.all([
        fetch("/api/admin/staff", { cache: "no-store" }),
        fetch("/api/admin/services", { cache: "no-store" }),
        fetch("/api/admin/clients", { cache: "no-store" }),
        fetch("/api/admin/bookings", { cache: "no-store" }),
        fetch("/api/admin/observability", { cache: "no-store" })
      ]);

      const staffData = (await staffResponse.json()) as { items?: StaffMember[]; error?: string };
      const servicesData = (await servicesResponse.json()) as {
        items?: ServiceItem[];
        error?: string;
      };
      const clientsData = (await clientsResponse.json()) as {
        items?: ClientRecord[];
        error?: string;
      };
      const bookingsData = (await bookingsResponse.json()) as {
        items?: BookingRecord[];
        error?: string;
      };
      const observabilityData = (await observabilityResponse.json()) as {
        snapshot?: {
          toolCalls?: ToolTraceRecord[];
          messagesLog?: MessageLogRecord[];
          events?: ObservabilityEventRecord[];
          dialogReviews?: DialogReviewRecord[];
          escalations?: EscalationRecord[];
          sources?: {
            messagesLog: SnapshotSource;
            dialogReviews: SnapshotSource;
          };
        };
      };

      if (!staffResponse.ok) {
        throw new Error(staffData.error ?? "Failed to load staff");
      }
      if (!servicesResponse.ok) {
        throw new Error(servicesData.error ?? "Failed to load services");
      }
      if (!clientsResponse.ok) {
        throw new Error(clientsData.error ?? "Failed to load clients");
      }
      if (!bookingsResponse.ok) {
        throw new Error(bookingsData.error ?? "Failed to load bookings");
      }
      if (!observabilityResponse.ok) {
        throw new Error("Failed to load observability snapshot");
      }

      setStaff(staffData.items ?? []);
      setServices(servicesData.items ?? []);
      setClients(clientsData.items ?? []);
      setBookings(bookingsData.items ?? []);

      if (observabilityData.snapshot) {
        setToolCalls(observabilityData.snapshot.toolCalls ?? []);
        setMessagesLog(observabilityData.snapshot.messagesLog ?? []);
        setEvents(observabilityData.snapshot.events ?? []);
        setDialogReviews(observabilityData.snapshot.dialogReviews ?? []);
        setEscalations(observabilityData.snapshot.escalations ?? []);
        setSources(
          observabilityData.snapshot.sources ?? {
            messagesLog: "local",
            dialogReviews: "local"
          }
        );
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function seedDefaults() {
    setBusy("seed");
    setError("");

    try {
      const response = await fetch("/api/admin/seed", { method: "POST" });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to seed defaults");
      }

      await loadAll();
      setStaffForm(emptyStaffForm);
      setServiceForm(emptyServiceForm);
      setClientForm(emptyClientForm);
      setBookingForm(emptyBookingForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Seed error");
    } finally {
      setBusy("");
    }
  }

  async function exportSnapshot() {
    setBusy("export");
    setError("");

    try {
      const response = await fetch("/api/admin/export", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Failed to export snapshot");
      }

      window.navigator.clipboard.writeText(JSON.stringify(data.snapshot, null, 2)).catch(() => {
        return undefined;
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Export error");
    } finally {
      setBusy("");
    }
  }

  async function submitStaff() {
    setBusy("staff-save");
    setError("");

    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm)
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save staff");
      }

      await loadAll();
      setStaffForm(emptyStaffForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Staff save error");
    } finally {
      setBusy("");
    }
  }

  async function submitService() {
    setBusy("service-save");
    setError("");

    try {
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(serviceForm)
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save service");
      }

      await loadAll();
      setServiceForm(emptyServiceForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Service save error");
    } finally {
      setBusy("");
    }
  }

  async function submitClient() {
    setBusy("client-save");
    setError("");

    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: clientForm.id || undefined,
          name: clientForm.name,
          phone: clientForm.phone,
          visitCount: clientForm.visitCount,
          notes: clientForm.notes,
          tags: parseTags(clientForm.tagsText)
        })
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save client");
      }

      await loadAll();
      setClientForm(emptyClientForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Client save error");
    } finally {
      setBusy("");
    }
  }

  async function submitBooking() {
    setBusy("booking-save");
    setError("");

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingForm)
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save booking");
      }

      await loadAll();
      setBookingForm(emptyBookingForm);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Booking save error");
    } finally {
      setBusy("");
    }
  }

  async function removeStaff(id: string) {
    setBusy(`staff-delete-${id}`);
    try {
      await fetch(`/api/admin/staff?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadAll();
    } finally {
      setBusy("");
    }
  }

  async function removeService(id: string) {
    setBusy(`service-delete-${id}`);
    try {
      await fetch(`/api/admin/services?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadAll();
    } finally {
      setBusy("");
    }
  }

  async function removeClient(id: string) {
    setBusy(`client-delete-${id}`);
    try {
      await fetch(`/api/admin/clients?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadAll();
    } finally {
      setBusy("");
    }
  }

  async function removeBooking(id: string) {
    setBusy(`booking-delete-${id}`);
    try {
      await fetch(`/api/admin/bookings?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await loadAll();
    } finally {
      setBusy("");
    }
  }

  function renderTableShell(
    title: string,
    count: number,
    content: React.ReactNode,
    toolbar?: React.ReactNode
  ) {
    return (
      <section className="admin-page-block">
        <div className="admin-page-title">
          <span>{title}</span>
          <span className="admin-page-subtitle">{count} rows</span>
        </div>
        {toolbar ? <div className="admin-toolbar">{toolbar}</div> : null}
        <div className="admin-table-wrap">{content}</div>
      </section>
    );
  }

  return (
    <section className="admin-console">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">VAngel Sandbox Admin</div>

        {navGroups.map((group) => (
          <div key={group.title} className="admin-sidebar-group">
            <div className="admin-sidebar-group-title">{group.title}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={`admin-sidebar-link${activeTab === item.id ? " active" : ""}`}
                onClick={() => setActiveTab(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <div className="admin-main">
        <div className="admin-classic-topbar">
          <div className="admin-classic-brand">
            Mock Admin <span>·</span> Sandbox control surface
          </div>
          <div className="admin-classic-spacer" />
          <button
            className="admin-btn admin-btn-gray"
            disabled={busy === "export"}
            onClick={() => void exportSnapshot()}
            type="button"
          >
            Export JSON
          </button>
          <button
            className="admin-btn admin-btn-green"
            disabled={busy === "seed"}
            onClick={() => void seedDefaults()}
            type="button"
          >
            Seed defaults
          </button>
        </div>

        <div className="admin-content">
          <div className="admin-page-header">
            <div className="admin-page-title-row">
              <h1>
                {activeTab === "overview" && "Dashboard"}
                {activeTab === "staff" && "Staff"}
                {activeTab === "services" && "Services"}
                {activeTab === "clients" && "Clients"}
                {activeTab === "bookings" && "Bookings"}
                {activeTab === "observability" && "Observability"}
              </h1>
              <span className="admin-page-note">{loading ? "Loading..." : "Live snapshot"}</span>
            </div>
            <p className="admin-page-description">
              {activeTab === "overview" &&
                "Daily control view for the sandbox state, recent events and delivery progress."}
              {activeTab === "staff" &&
                "Manage masters, roles and service links in one dense table and edit form."}
              {activeTab === "services" &&
                "Keep the service catalog tight: duration, price and active state."}
              {activeTab === "clients" &&
                "Review sandbox client profiles, notes, tags and visit counts."}
              {activeTab === "bookings" &&
                "Create and update manual bookings to steer scenario testing."}
              {activeTab === "observability" &&
                "Review signals, traces, message logs and escalations in one place."}
            </p>
          </div>

          {error ? <div className="admin-notice admin-notice-error">{error}</div> : null}

          {activeTab === "overview" ? (
            <>
              <div className="admin-stat-grid">
                {stats.map((item) => (
                  <div key={item.label} className="admin-stat-card">
                    <div className="admin-stat-value">{item.value}</div>
                    <div className="admin-stat-label">{item.label}</div>
                    <div className="admin-stat-diff">{item.diff}</div>
                  </div>
                ))}
              </div>

              <div className="admin-two-col">
                <section className="admin-page-block">
                  <div className="admin-page-title">
                    <span>Done</span>
                    <span className="admin-page-subtitle">{doneItems.length}</span>
                  </div>
                  <div className="admin-plain-list">
                    {doneItems.map((item) => (
                      <div key={item} className="admin-plain-row">
                        <span className="admin-badge admin-badge-green">done</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="admin-page-block">
                  <div className="admin-page-title">
                    <span>Next</span>
                    <span className="admin-page-subtitle">{nextItems.length}</span>
                  </div>
                  <div className="admin-plain-list">
                    {nextItems.map((item) => (
                      <div key={item} className="admin-plain-row">
                        <span className="admin-badge admin-badge-gold">next</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {renderTableShell(
                "Recent Event Log",
                events.length,
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Title</th>
                      <th>Detail</th>
                      <th>Meta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.slice(0, 12).map((item) => (
                      <tr key={item.id}>
                        <td className="muted-cell">{formatTime(item.timestamp)}</td>
                        <td>
                          <span className={`admin-badge admin-badge-${toneClass(item.tone)}`}>
                            {item.kind}
                          </span>
                        </td>
                        <td>{item.title}</td>
                        <td>{item.detail}</td>
                        <td className="muted-cell">{item.meta ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : null}

          {activeTab === "staff" ? (
            <div className="admin-editor-layout">
              <div className="admin-editor-main">
                {renderTableShell(
                  "Staff Directory",
                  staff.length,
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Services</th>
                        <th>Status</th>
                        <th className="actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.role}</td>
                          <td>{item.serviceIds.length}</td>
                          <td>
                            <span className={`admin-badge ${item.active ? "admin-badge-green" : "admin-badge-gray"}`}>
                              {item.active ? "active" : "off"}
                            </span>
                          </td>
                          <td className="actions-col">
                            <button
                              className="admin-btn admin-btn-white admin-btn-xs"
                              onClick={() =>
                                setStaffForm({
                                  id: item.id,
                                  name: item.name,
                                  role: item.role,
                                  notes: item.notes,
                                  active: item.active,
                                  serviceIds: item.serviceIds
                                })
                              }
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="admin-btn admin-btn-red admin-btn-xs"
                              disabled={busy === `staff-delete-${item.id}`}
                              onClick={() => void removeStaff(item.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>,
                  <>
                    <span className="admin-toolbar-label">Masters and activity</span>
                    <div className="admin-toolbar-spacer" />
                    <span className="admin-badge admin-badge-blue">
                      {staff.filter((item) => item.active).length} active
                    </span>
                  </>
                )}
              </div>

              <section className="admin-form-card">
                <div className="admin-form-head">Staff Editor</div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Name</div>
                  <div className="admin-form-field">
                    <input
                      value={staffForm.name}
                      onChange={(event) =>
                        setStaffForm((current) => ({ ...current, name: event.target.value }))
                      }
                      type="text"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Role</div>
                  <div className="admin-form-field">
                    <input
                      value={staffForm.role}
                      onChange={(event) =>
                        setStaffForm((current) => ({ ...current, role: event.target.value }))
                      }
                      type="text"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Notes</div>
                  <div className="admin-form-field">
                    <textarea
                      value={staffForm.notes}
                      onChange={(event) =>
                        setStaffForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      rows={4}
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Status</div>
                  <div className="admin-form-field">
                    <label className="admin-check">
                      <input
                        checked={staffForm.active}
                        onChange={(event) =>
                          setStaffForm((current) => ({ ...current, active: event.target.checked }))
                        }
                        type="checkbox"
                      />
                      <span>Active master</span>
                    </label>
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Services</div>
                  <div className="admin-form-field admin-check-grid">
                    {serviceOptions.map((service) => {
                      const checked = staffForm.serviceIds.includes(service.id);

                      return (
                        <label key={service.id} className="admin-check">
                          <input
                            checked={checked}
                            onChange={(event) =>
                              setStaffForm((current) => ({
                                ...current,
                                serviceIds: event.target.checked
                                  ? [...current.serviceIds, service.id]
                                  : current.serviceIds.filter((id) => id !== service.id)
                              }))
                            }
                            type="checkbox"
                          />
                          <span>{service.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="admin-form-actions">
                  <button
                    className="admin-btn admin-btn-gray"
                    onClick={() => setStaffForm(emptyStaffForm)}
                    type="button"
                  >
                    Clear
                  </button>
                  <button
                    className="admin-btn admin-btn-green"
                    disabled={busy === "staff-save"}
                    onClick={() => void submitStaff()}
                    type="button"
                  >
                    Save
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "services" ? (
            <div className="admin-editor-layout">
              <div className="admin-editor-main">
                {renderTableShell(
                  "Service Catalog",
                  services.length,
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Duration</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th className="actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.durationMinutes} min</td>
                          <td>{item.priceFrom} UAH</td>
                          <td>
                            <span className={`admin-badge ${item.active ? "admin-badge-green" : "admin-badge-gray"}`}>
                              {item.active ? "active" : "off"}
                            </span>
                          </td>
                          <td className="actions-col">
                            <button
                              className="admin-btn admin-btn-white admin-btn-xs"
                              onClick={() =>
                                setServiceForm({
                                  id: item.id,
                                  name: item.name,
                                  durationMinutes: item.durationMinutes,
                                  priceFrom: item.priceFrom,
                                  active: item.active
                                })
                              }
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="admin-btn admin-btn-red admin-btn-xs"
                              disabled={busy === `service-delete-${item.id}`}
                              onClick={() => void removeService(item.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <section className="admin-form-card">
                <div className="admin-form-head">Service Editor</div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Name</div>
                  <div className="admin-form-field">
                    <input
                      value={serviceForm.name}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, name: event.target.value }))
                      }
                      type="text"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Duration</div>
                  <div className="admin-form-field">
                    <input
                      value={serviceForm.durationMinutes}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          durationMinutes: Number(event.target.value)
                        }))
                      }
                      type="number"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Price from</div>
                  <div className="admin-form-field">
                    <input
                      value={serviceForm.priceFrom}
                      onChange={(event) =>
                        setServiceForm((current) => ({
                          ...current,
                          priceFrom: Number(event.target.value)
                        }))
                      }
                      type="number"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Status</div>
                  <div className="admin-form-field">
                    <label className="admin-check">
                      <input
                        checked={serviceForm.active}
                        onChange={(event) =>
                          setServiceForm((current) => ({ ...current, active: event.target.checked }))
                        }
                        type="checkbox"
                      />
                      <span>Active service</span>
                    </label>
                  </div>
                </div>
                <div className="admin-form-actions">
                  <button
                    className="admin-btn admin-btn-gray"
                    onClick={() => setServiceForm(emptyServiceForm)}
                    type="button"
                  >
                    Clear
                  </button>
                  <button
                    className="admin-btn admin-btn-green"
                    disabled={busy === "service-save"}
                    onClick={() => void submitService()}
                    type="button"
                  >
                    Save
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "clients" ? (
            <div className="admin-editor-layout">
              <div className="admin-editor-main">
                {renderTableShell(
                  "Client Directory",
                  clients.length,
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Visits</th>
                        <th>Tags</th>
                        <th className="actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((item) => (
                        <tr key={item.id}>
                          <td>{item.name}</td>
                          <td>{item.phone}</td>
                          <td>{item.visitCount}</td>
                          <td>{item.tags.join(", ") || "—"}</td>
                          <td className="actions-col">
                            <button
                              className="admin-btn admin-btn-white admin-btn-xs"
                              onClick={() =>
                                setClientForm({
                                  id: item.id,
                                  name: item.name,
                                  phone: item.phone,
                                  visitCount: item.visitCount,
                                  notes: item.notes,
                                  tagsText: item.tags.join(", ")
                                })
                              }
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="admin-btn admin-btn-red admin-btn-xs"
                              disabled={busy === `client-delete-${item.id}`}
                              onClick={() => void removeClient(item.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <section className="admin-form-card">
                <div className="admin-form-head">Client Editor</div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Name</div>
                  <div className="admin-form-field">
                    <input
                      value={clientForm.name}
                      onChange={(event) =>
                        setClientForm((current) => ({ ...current, name: event.target.value }))
                      }
                      type="text"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Phone</div>
                  <div className="admin-form-field">
                    <input
                      value={clientForm.phone}
                      onChange={(event) =>
                        setClientForm((current) => ({ ...current, phone: event.target.value }))
                      }
                      type="text"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Visit count</div>
                  <div className="admin-form-field">
                    <input
                      value={clientForm.visitCount}
                      onChange={(event) =>
                        setClientForm((current) => ({
                          ...current,
                          visitCount: Number(event.target.value)
                        }))
                      }
                      type="number"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Tags</div>
                  <div className="admin-form-field">
                    <input
                      value={clientForm.tagsText}
                      onChange={(event) =>
                        setClientForm((current) => ({ ...current, tagsText: event.target.value }))
                      }
                      placeholder="vip, regular"
                      type="text"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Notes</div>
                  <div className="admin-form-field">
                    <textarea
                      value={clientForm.notes}
                      onChange={(event) =>
                        setClientForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      rows={4}
                    />
                  </div>
                </div>
                <div className="admin-form-actions">
                  <button
                    className="admin-btn admin-btn-gray"
                    onClick={() => setClientForm(emptyClientForm)}
                    type="button"
                  >
                    Clear
                  </button>
                  <button
                    className="admin-btn admin-btn-green"
                    disabled={busy === "client-save"}
                    onClick={() => void submitClient()}
                    type="button"
                  >
                    Save
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "bookings" ? (
            <div className="admin-editor-layout">
              <div className="admin-editor-main">
                {renderTableShell(
                  "Bookings",
                  bookings.length,
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Phone</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Source</th>
                        <th className="actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((item) => (
                        <tr key={item.id}>
                          <td>{item.clientName}</td>
                          <td>{item.clientPhone}</td>
                          <td>{formatShortDate(item.datetime)}</td>
                          <td>
                            <span className={`admin-badge ${item.status === "confirmed" ? "admin-badge-green" : "admin-badge-red"}`}>
                              {item.status}
                            </span>
                          </td>
                          <td>{item.source}</td>
                          <td className="actions-col">
                            <button
                              className="admin-btn admin-btn-white admin-btn-xs"
                              onClick={() =>
                                setBookingForm({
                                  id: item.id,
                                  clientName: item.clientName,
                                  clientPhone: item.clientPhone,
                                  staffId: item.staffId,
                                  serviceId: item.serviceId,
                                  datetime: item.datetime,
                                  status: item.status,
                                  source: item.source
                                })
                              }
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="admin-btn admin-btn-red admin-btn-xs"
                              disabled={busy === `booking-delete-${item.id}`}
                              onClick={() => void removeBooking(item.id)}
                              type="button"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <section className="admin-form-card">
                <div className="admin-form-head">Booking Editor</div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Client name</div>
                  <div className="admin-form-field">
                    <input
                      value={bookingForm.clientName}
                      onChange={(event) =>
                        setBookingForm((current) => ({
                          ...current,
                          clientName: event.target.value
                        }))
                      }
                      type="text"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Client phone</div>
                  <div className="admin-form-field">
                    <input
                      value={bookingForm.clientPhone}
                      onChange={(event) =>
                        setBookingForm((current) => ({
                          ...current,
                          clientPhone: event.target.value
                        }))
                      }
                      type="text"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Staff</div>
                  <div className="admin-form-field">
                    <select
                      value={bookingForm.staffId}
                      onChange={(event) =>
                        setBookingForm((current) => ({
                          ...current,
                          staffId: event.target.value
                        }))
                      }
                    >
                      <option value="">Select staff</option>
                      {staffOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Service</div>
                  <div className="admin-form-field">
                    <select
                      value={bookingForm.serviceId}
                      onChange={(event) =>
                        setBookingForm((current) => ({
                          ...current,
                          serviceId: event.target.value
                        }))
                      }
                    >
                      <option value="">Select service</option>
                      {serviceOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Date time</div>
                  <div className="admin-form-field">
                    <input
                      value={bookingForm.datetime}
                      onChange={(event) =>
                        setBookingForm((current) => ({
                          ...current,
                          datetime: event.target.value
                        }))
                      }
                      placeholder="2026-04-24T14:00:00+03:00"
                      type="text"
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-label">Status</div>
                  <div className="admin-form-field">
                    <select
                      value={bookingForm.status}
                      onChange={(event) =>
                        setBookingForm((current) => ({
                          ...current,
                          status: event.target.value as BookingRecord["status"]
                        }))
                      }
                    >
                      <option value="confirmed">confirmed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="admin-form-actions">
                  <button
                    className="admin-btn admin-btn-gray"
                    onClick={() => setBookingForm(emptyBookingForm)}
                    type="button"
                  >
                    Clear
                  </button>
                  <button
                    className="admin-btn admin-btn-green"
                    disabled={busy === "booking-save"}
                    onClick={() => void submitBooking()}
                    type="button"
                  >
                    Save
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "observability" ? (
            <>
              {renderTableShell(
                "Dialog Reviews",
                dialogReviews.length,
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Contact</th>
                      <th>Reasons</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dialogReviews.slice(0, 20).map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className={`admin-badge admin-badge-${item.severity}`}>
                            {item.severity}
                          </span>
                        </td>
                        <td>{item.contactId || "—"}</td>
                        <td>{item.triggerReasons.join(", ")}</td>
                        <td>{item.confidenceScore.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>,
                <>
                  <span className="admin-toolbar-label">Source</span>
                  <span className="admin-badge admin-badge-blue">{sources.dialogReviews}</span>
                </>
              )}

              {renderTableShell(
                "Messages Log",
                messagesLog.length,
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Direction</th>
                      <th>Contact</th>
                      <th>Text</th>
                      <th>Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messagesLog.slice(0, 25).map((item) => (
                      <tr key={item.id}>
                        <td className="muted-cell">{formatTime(item.timestamp)}</td>
                        <td>{item.direction}</td>
                        <td>{item.contactId || "—"}</td>
                        <td>{item.agentReply ?? item.userMessage ?? item.text}</td>
                        <td className="muted-cell">{item.provider}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>,
                <>
                  <span className="admin-toolbar-label">Source</span>
                  <span className="admin-badge admin-badge-blue">{sources.messagesLog}</span>
                </>
              )}

              <div className="admin-two-col">
                {renderTableShell(
                  "Tool Trace",
                  toolCalls.length,
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Tool</th>
                        <th>Status</th>
                        <th>Contact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toolCalls.slice(0, 16).map((item) => (
                        <tr key={item.id}>
                          <td className="muted-cell">{formatTime(item.timestamp)}</td>
                          <td>{item.toolName}</td>
                          <td>
                            <span
                              className={`admin-badge ${
                                item.status === "error" ? "admin-badge-red" : "admin-badge-green"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td>{item.contactId || "global"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {renderTableShell(
                  "Escalations",
                  escalations.length,
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Contact</th>
                        <th>Reason</th>
                        <th>Context</th>
                      </tr>
                    </thead>
                    <tbody>
                      {escalations.slice(0, 16).map((item) => (
                        <tr key={item.id}>
                          <td className="muted-cell">{formatTime(item.timestamp)}</td>
                          <td>{item.contactId}</td>
                          <td>{item.reason}</td>
                          <td>{item.context || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
