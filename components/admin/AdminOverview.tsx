"use client";

import { useEffect, useMemo, useState } from "react";
import { ServiceItem, StaffMember } from "@/lib/types";

type AdminTab = "staff" | "services";

const tabs: Array<{ id: AdminTab; title: string; description: string }> = [
  {
    id: "staff",
    title: "Staff",
    description: "Майстри, активність, ролі, сервісні зв'язки."
  },
  {
    id: "services",
    title: "Services",
    description: "Послуги, тривалість, ціни і доступність."
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

export function AdminOverview() {
  const [activeTab, setActiveTab] = useState<AdminTab>("staff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);

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
      const [staffResponse, servicesResponse] = await Promise.all([
        fetch("/api/admin/staff", { cache: "no-store" }),
        fetch("/api/admin/services", { cache: "no-store" })
      ]);
      const staffData = (await staffResponse.json()) as { items?: StaffMember[]; error?: string };
      const servicesData = (await servicesResponse.json()) as {
        items?: ServiceItem[];
        error?: string;
      };

      if (!staffResponse.ok) {
        throw new Error(staffData.error ?? "Не вдалося отримати staff");
      }

      if (!servicesResponse.ok) {
        throw new Error(servicesData.error ?? "Не вдалося отримати services");
      }

      setStaff(staffData.items ?? []);
      setServices(servicesData.items ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Помилка завантаження");
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
        throw new Error(data.error ?? "Не вдалося виконати seed");
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
        throw new Error("Не вдалося експортувати snapshot");
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
        throw new Error(data.error ?? "Не вдалося зберегти staff");
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
        throw new Error(data.error ?? "Не вдалося зберегти service");
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
      <section className="hero hero-tight compact admin-hero">
        <div>
          <p className="eyebrow">Mock Admin</p>
          <h1>Компактний mock admin для staff і services</h1>
          <p className="hero-copy">
            Робоча область зібрана навколо швидкого редагування: вибір секції,
            список, редактор і короткі fixture-дії без зайвих великих блоків.
          </p>
        </div>
        <div className="admin-hero-meta">
          <div className="stat-card compact-stat-card">
            <span className="stat-label">Section</span>
            <strong>{activeTab === "staff" ? "Staff" : "Services"}</strong>
          </div>
          <div className="stat-card compact-stat-card">
            <span className="stat-label">Status</span>
            <strong>{loading ? "Loading..." : "API connected"}</strong>
          </div>
        </div>
      </section>

      <section className="panel admin-toolbar">
        <div className="toolbar-block">
          <span className="panel-kicker">Sections</span>
          <div className="compact-tabs">
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
        </div>

        <div className="toolbar-block toolbar-actions">
          <span className="panel-kicker">Quick Actions</span>
          <div className="compact-actions">
            <button
              className="primary-button"
              disabled={busy === "seed"}
              onClick={() => void seedDefaults()}
              type="button"
            >
              Seed defaults
            </button>
            <button
              className="secondary-button"
              disabled={busy === "export"}
              onClick={() => void exportSnapshot()}
              type="button"
            >
              Export snapshot
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="alert-box admin-alert">{error}</div> : null}

      <section className="admin-layout compact-admin-layout">
        <div className="panel admin-workspace full-span">
          <div className="panel-header compact-panel-header">
            <div>
              <p className="panel-kicker">Workspace</p>
              <h2>{activeTab === "staff" ? "Staff Manager" : "Services Manager"}</h2>
            </div>
            <span className="panel-note">
              {activeTab === "staff"
                ? "Майстри, ролі, active, service links"
                : "Каталог послуг, тривалість, ціни"}
            </span>
          </div>

          {activeTab === "staff" ? (
            <div className="admin-grid compact-admin-grid">
              <div className="mini-panel compact-panel-shell">
                <h3>List</h3>
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
                      <p>{item.notes || "Без нотаток"}</p>
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
                <h3>Editor</h3>
                <div className="settings-form single-column">
                  <label className="field">
                    <span>Ім'я</span>
                    <input
                      value={staffForm.name}
                      onChange={(event) =>
                        setStaffForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Роль</span>
                    <input
                      value={staffForm.role}
                      onChange={(event) =>
                        setStaffForm((current) => ({ ...current, role: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Нотатки</span>
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
                    <span>Активний майстер</span>
                  </label>
                  <div className="field">
                    <span>Послуги</span>
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
                <h3>List</h3>
                <div className="entity-list compact-entity-list">
                  {services.map((item) => (
                    <div key={item.id} className="entity-card">
                      <div className="entity-card-row">
                        <strong>{item.name}</strong>
                        <span className={`status-badge${item.active ? " on" : ""}`}>
                          {item.active ? "active" : "off"}
                        </span>
                      </div>
                      <p>{item.durationMinutes} хв</p>
                      <p>від {item.priceFrom} грн</p>
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
                <h3>Editor</h3>
                <div className="settings-form single-column">
                  <label className="field">
                    <span>Назва</span>
                    <input
                      value={serviceForm.name}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Тривалість, хв</span>
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
                    <span>Ціна від</span>
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
                  <label className="toggle-field">
                    <input
                      checked={serviceForm.active}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, active: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span>Послуга активна</span>
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
      </section>
    </>
  );
}
