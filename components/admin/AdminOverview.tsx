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

type AdminTab = "staff" | "services";

const tabs: Array<{ id: AdminTab; title: string; description: string }> = [
  {
    id: "staff",
    title: "Staff",
    description: "Masters, roles, activity and service links."
  },
  {
    id: "services",
    title: "Services",
    description: "Catalog, duration, prices and availability."
  }
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

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function AdminOverview() {
  const [activeTab, setActiveTab] = useState<AdminTab>("staff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
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

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [staffResponse, servicesResponse, observabilityResponse] = await Promise.all([
        fetch("/api/admin/staff", { cache: "no-store" }),
        fetch("/api/admin/services", { cache: "no-store" }),
        fetch("/api/admin/observability", { cache: "no-store" })
      ]);
      const staffData = (await staffResponse.json()) as { items?: StaffMember[]; error?: string };
      const servicesData = (await servicesResponse.json()) as {
        items?: ServiceItem[];
        error?: string;
      };
      const observabilityData = (await observabilityResponse.json()) as {
        snapshot?: {
          clients?: ClientRecord[];
          bookings?: BookingRecord[];
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

      if (!observabilityResponse.ok) {
        throw new Error("Failed to load observability snapshot");
      }

      setStaff(staffData.items ?? []);
      setServices(servicesData.items ?? []);
      if (observabilityData.snapshot) {
        setClients(observabilityData.snapshot.clients ?? []);
        setBookings(observabilityData.snapshot.bookings ?? []);
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
        headers: {
          "Content-Type": "application/json"
        },
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
        headers: {
          "Content-Type": "application/json"
        },
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

  return (
    <>
      <section className="panel admin-topbar">
        <div className="admin-title-group">
          <p className="eyebrow">Mock Admin</p>
          <h1>Salon Data Control</h1>
        </div>

        <div className="admin-inline-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`compact-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.title}
            </button>
          ))}
        </div>

        <div className="admin-meta-strip">
          <span className="status-chip">
            {activeTab === "staff" ? `${staff.length} staff` : `${services.length} services`}
          </span>
          <span className="status-chip">{loading ? "Loading..." : "API connected"}</span>
        </div>

        <div className="compact-actions admin-top-actions">
          <button
            className="secondary-button"
            disabled={busy === "export"}
            onClick={() => void exportSnapshot()}
            type="button"
          >
            Export
          </button>
          <button
            className="primary-button"
            disabled={busy === "seed"}
            onClick={() => void seedDefaults()}
            type="button"
          >
            Seed
          </button>
        </div>
      </section>

      {error ? <div className="alert-box admin-alert">{error}</div> : null}

      <section className="admin-layout compact-admin-layout">
        <div className="panel admin-workspace full-span">
          <div className="panel-header compact-panel-header admin-workspace-header">
            <div>
              <h2>{activeTab === "staff" ? "Staff Manager" : "Services Manager"}</h2>
            </div>
            <span className="panel-note">
              {activeTab === "staff"
                ? "Masters, roles, active flags and service links"
                : "Catalog, duration and base price"}
            </span>
          </div>

          {activeTab === "staff" ? (
            <div className="admin-grid compact-admin-grid">
              <div className="mini-panel compact-panel-shell">
                <div className="mini-panel-header">
                  <h3>List</h3>
                  <span className="panel-note">{staff.length} items</span>
                </div>
                <div className="entity-list compact-entity-list">
                  {staff.map((item) => (
                    <div key={item.id} className="entity-card">
                      <div className="entity-card-row">
                        <strong>{item.name}</strong>
                        <span className={`status-badge${item.active ? " on" : ""}`}>
                          {item.active ? "active" : "off"}
                        </span>
                      </div>
                      <p>{item.role}</p>
                      <p>{item.notes || "No notes"}</p>
                      <div className="entity-card-row">
                        <button
                          className="secondary-button"
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
                          className="secondary-button"
                          disabled={busy === `staff-delete-${item.id}`}
                          onClick={() => void removeStaff(item.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mini-panel compact-panel-shell">
                <div className="mini-panel-header">
                  <h3>Editor</h3>
                  <span className="panel-note">
                    {staffForm.id ? "Editing existing record" : "Create new record"}
                  </span>
                </div>
                <div className="settings-form single-column">
                  <div className="compact-form-grid">
                    <label className="field">
                      <span>Name</span>
                      <input
                        value={staffForm.name}
                        onChange={(event) =>
                          setStaffForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Role</span>
                      <input
                        value={staffForm.role}
                        onChange={(event) =>
                          setStaffForm((current) => ({ ...current, role: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Notes</span>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      value={staffForm.notes}
                      onChange={(event) =>
                        setStaffForm((current) => ({ ...current, notes: event.target.value }))
                      }
                    />
                  </label>
                  <label className="toggle-field">
                    <input
                      checked={staffForm.active}
                      onChange={(event) =>
                        setStaffForm((current) => ({ ...current, active: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span>Active master</span>
                  </label>
                  <div className="field">
                    <span>Services</span>
                    <div className="check-grid">
                      {serviceOptions.map((service) => {
                        const checked = staffForm.serviceIds.includes(service.id);

                        return (
                          <label key={service.id} className="check-item">
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
                  <div className="composer-actions">
                    <button
                      className="secondary-button"
                      onClick={() => setStaffForm(emptyStaffForm)}
                      type="button"
                    >
                      Clear
                    </button>
                    <button
                      className="primary-button"
                      disabled={busy === "staff-save"}
                      onClick={() => void submitStaff()}
                      type="button"
                    >
                      Save staff
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-grid compact-admin-grid">
              <div className="mini-panel compact-panel-shell">
                <div className="mini-panel-header">
                  <h3>List</h3>
                  <span className="panel-note">{services.length} items</span>
                </div>
                <div className="entity-list compact-entity-list">
                  {services.map((item) => (
                    <div key={item.id} className="entity-card">
                      <div className="entity-card-row">
                        <strong>{item.name}</strong>
                        <span className={`status-badge${item.active ? " on" : ""}`}>
                          {item.active ? "active" : "off"}
                        </span>
                      </div>
                      <p>{item.durationMinutes} min</p>
                      <p>from {item.priceFrom} UAH</p>
                      <div className="entity-card-row">
                        <button
                          className="secondary-button"
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
                          className="secondary-button"
                          disabled={busy === `service-delete-${item.id}`}
                          onClick={() => void removeService(item.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mini-panel compact-panel-shell">
                <div className="mini-panel-header">
                  <h3>Editor</h3>
                  <span className="panel-note">
                    {serviceForm.id ? "Editing existing record" : "Create new record"}
                  </span>
                </div>
                <div className="settings-form single-column">
                  <div className="compact-form-grid compact-form-grid-3">
                    <label className="field">
                      <span>Name</span>
                      <input
                        value={serviceForm.name}
                        onChange={(event) =>
                          setServiceForm((current) => ({ ...current, name: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Duration</span>
                      <input
                        type="number"
                        value={serviceForm.durationMinutes}
                        onChange={(event) =>
                          setServiceForm((current) => ({
                            ...current,
                            durationMinutes: Number(event.target.value)
                          }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Price from</span>
                      <input
                        type="number"
                        value={serviceForm.priceFrom}
                        onChange={(event) =>
                          setServiceForm((current) => ({
                            ...current,
                            priceFrom: Number(event.target.value)
                          }))
                        }
                      />
                    </label>
                  </div>
                  <label className="toggle-field">
                    <input
                      checked={serviceForm.active}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, active: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span>Service is active</span>
                  </label>
                  <div className="composer-actions">
                    <button
                      className="secondary-button"
                      onClick={() => setServiceForm(emptyServiceForm)}
                      type="button"
                    >
                      Clear
                    </button>
                    <button
                      className="primary-button"
                      disabled={busy === "service-save"}
                      onClick={() => void submitService()}
                      type="button"
                    >
                      Save service
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="panel admin-observability full-span">
          <div className="panel-header compact-panel-header admin-workspace-header">
            <div>
              <h2>Observability</h2>
            </div>
            <span className="panel-note">Compact rows for logs, reviews, bookings and clients</span>
          </div>

          <div className="admin-observability-grid">
            <div className="mini-panel compact-panel-shell">
              <div className="mini-panel-header">
                <h3>Clients</h3>
                <span className="panel-note">{clients.length}</span>
              </div>
              <div className="flat-list compact-entity-list">
                {clients.slice(0, 8).map((client) => (
                  <div key={client.id} className="list-row">
                    <div className="list-row-main">
                      <strong>{client.name}</strong>
                      <span className="row-text">
                        {client.phone} · {client.tags.join(", ") || "no tags"}
                      </span>
                    </div>
                    <span className="row-meta">{client.visitCount} visits</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mini-panel compact-panel-shell">
              <div className="mini-panel-header">
                <h3>Bookings</h3>
                <span className="panel-note">{bookings.length}</span>
              </div>
              <div className="flat-list compact-entity-list">
                {bookings.slice(0, 8).map((booking) => (
                  <div key={booking.id} className="list-row">
                    <div className="list-row-main">
                      <strong>{booking.clientName}</strong>
                      <span className="row-text">
                        {booking.datetime} · {booking.source}
                      </span>
                    </div>
                    <span className={`status-badge${booking.status === "confirmed" ? " on" : ""}`}>
                      {booking.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mini-panel compact-panel-shell">
              <div className="mini-panel-header">
                <h3>Dialog Reviews</h3>
                <span className="panel-note">
                  {dialogReviews.length} · {sources.dialogReviews}
                </span>
              </div>
              <div className="flat-list compact-entity-list">
                {dialogReviews.slice(0, 8).map((review) => (
                  <div key={review.id} className="list-row">
                    <div className="list-row-main">
                      <span className={`tone-pill ${review.severity}`} />
                      <strong>{review.severity.toUpperCase()}</strong>
                      <span className="row-text">
                        {review.contactId || "no contact"} · {review.triggerReasons.join(", ")}
                      </span>
                    </div>
                    <span className="row-meta">c {review.confidenceScore.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mini-panel compact-panel-shell">
              <div className="mini-panel-header">
                <h3>Tool Trace</h3>
                <span className="panel-note">{toolCalls.length}</span>
              </div>
              <div className="flat-list compact-entity-list">
                {toolCalls.slice(0, 8).map((tool) => (
                  <div key={tool.id} className="list-row">
                    <div className="list-row-main">
                      <span className={`tone-pill ${tool.status === "error" ? "red" : "green"}`} />
                      <strong>{tool.toolName}</strong>
                      <span className="row-text">{tool.contactId || "global"}</span>
                    </div>
                    <span className="row-meta">{tool.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mini-panel compact-panel-shell">
              <div className="mini-panel-header">
                <h3>Messages Log</h3>
                <span className="panel-note">
                  {messagesLog.length} · {sources.messagesLog}
                </span>
              </div>
              <div className="flat-list compact-entity-list">
                {messagesLog.slice(0, 10).map((item) => (
                  <div key={item.id} className="list-row">
                    <div className="list-row-main">
                      <span
                        className={`tone-pill ${
                          item.direction === "incoming"
                            ? "neutral"
                            : item.direction === "outgoing"
                              ? "green"
                              : "yellow"
                        }`}
                      />
                      <strong>{item.direction}</strong>
                      <span className="row-text">
                        {item.agentReply ?? item.userMessage ?? item.text}
                      </span>
                    </div>
                    <span className="row-meta">{formatTime(item.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mini-panel compact-panel-shell">
              <div className="mini-panel-header">
                <h3>Event Log</h3>
                <span className="panel-note">{events.length}</span>
              </div>
              <div className="flat-list compact-entity-list">
                {events.slice(0, 12).map((item) => (
                  <div key={item.id} className="list-row">
                    <div className="list-row-main">
                      <span className={`tone-pill ${item.tone ?? "neutral"}`} />
                      <strong>{item.title}</strong>
                      <span className="row-text">{item.detail}</span>
                    </div>
                    <span className="row-meta">{formatTime(item.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mini-panel compact-panel-shell">
              <div className="mini-panel-header">
                <h3>Escalations</h3>
                <span className="panel-note">{escalations.length}</span>
              </div>
              <div className="flat-list compact-entity-list">
                {escalations.slice(0, 8).map((item) => (
                  <div key={item.id} className="list-row">
                    <div className="list-row-main">
                      <span className="tone-pill red" />
                      <strong>{item.reason}</strong>
                      <span className="row-text">
                        {item.contactId} · {item.context || "No context"}
                      </span>
                    </div>
                    <span className="row-meta">{formatTime(item.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
