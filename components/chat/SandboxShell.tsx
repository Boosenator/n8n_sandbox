"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  DialogReviewRecord,
  PersonaOption,
  SandboxMessage,
  SessionPayload,
  ToolTraceRecord
} from "@/lib/types";

const storageKey = "vangel-sandbox-session";

const initialSession: SessionPayload = {
  webhookUrl: "",
  contactId: "SANDBOX_TEST_0001",
  contactName: "Тестовий клієнт",
  contactUsername: "sandbox_tester",
  persona: "new_client",
  debugPayload: false
};

const quickScenarios = [
  "Перший контакт",
  "Підбір майстра",
  "Запис на послугу",
  "Перенесення запису",
  "Скасування",
  "Ескалація до майстра"
];

const personaLabels: Record<PersonaOption, string> = {
  new_client: "New client",
  returning: "Returning",
  vip: "VIP",
  complaint: "Complaint"
};

export function SandboxShell() {
  const [session, setSession] = useState<SessionPayload>(initialSession);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<SandboxMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastPayload, setLastPayload] = useState<string>("");
  const [lastStatus, setLastStatus] = useState<string>("idle");
  const [error, setError] = useState<string>("");
  const [toolCalls, setToolCalls] = useState<ToolTraceRecord[]>([]);
  const [reviews, setReviews] = useState<DialogReviewRecord[]>([]);
  const lastTimestampRef = useRef<number | undefined>(undefined);

  const prettyPayload = useMemo(() => {
    if (!lastPayload) {
      return "Поки payload ще не згенеровано.";
    }

    return lastPayload;
  }, [lastPayload]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SessionPayload;
        setSession({ ...initialSession, ...parsed });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }, [ready, session]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    lastTimestampRef.current = undefined;
    void loadMessages();
    void loadObservability();
  }, [ready, session.contactId]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const timer = window.setInterval(() => {
      void pollMessages();
      void pollObservability();
    }, 2500);

    return () => window.clearInterval(timer);
  }, [ready, session.contactId]);

  function updateField<K extends keyof SessionPayload>(field: K, value: SessionPayload[K]) {
    setSession((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function loadMessages() {
    setLoadingMessages(true);
    setError("");

    try {
      const response = await fetch(
        `/api/sandbox/messages?contact_id=${encodeURIComponent(session.contactId)}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as { items?: SandboxMessage[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Не вдалося завантажити повідомлення");
      }

      const items = data.items ?? [];
      setMessages(items);
      lastTimestampRef.current = items.at(-1)?.timestamp;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Помилка завантаження повідомлень"
      );
    } finally {
      setLoadingMessages(false);
    }
  }

  async function loadObservability() {
    try {
      const response = await fetch(
        `/api/admin/observability?contact_id=${encodeURIComponent(session.contactId)}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as {
        snapshot?: {
          toolCalls?: ToolTraceRecord[];
          dialogReviews?: DialogReviewRecord[];
        };
      };

      if (!response.ok || !data.snapshot) {
        return;
      }

      setToolCalls(data.snapshot.toolCalls ?? []);
      setReviews(data.snapshot.dialogReviews ?? []);
    } catch {
      // Keep UI silent on trace refresh errors.
    }
  }

  async function pollMessages() {
    try {
      const suffix = lastTimestampRef.current
        ? `&since=${lastTimestampRef.current}`
        : "";
      const response = await fetch(
        `/api/sandbox/messages?contact_id=${encodeURIComponent(session.contactId)}${suffix}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as { items?: SandboxMessage[] };

      if (!response.ok || !data.items?.length) {
        return;
      }

      setMessages((current) => [...current, ...data.items!]);
      lastTimestampRef.current = data.items.at(-1)?.timestamp;
    } catch {
      // Ignore polling errors to keep the UI calm.
    }
  }

  async function pollObservability() {
    await loadObservability();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = draft.trim();

    if (!text) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...session,
          text
        })
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        payload?: unknown;
        webhookStatus?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Не вдалося відправити повідомлення");
      }

      setDraft("");
      setLastStatus(data.webhookStatus ?? "unknown");
      setLastPayload(data.payload ? JSON.stringify(data.payload, null, 2) : "");
      await loadMessages();
      await loadObservability();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Помилка відправки повідомлення"
      );
    } finally {
      setSending(false);
    }
  }

  async function resetConversation() {
    setError("");

    try {
      const response = await fetch("/api/sandbox/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contactId: session.contactId
        })
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Не вдалося очистити історію");
      }

      setMessages([]);
      lastTimestampRef.current = undefined;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Помилка reset");
    }
  }

  return (
    <>
      <section className="hero hero-tight">
        <div>
          <p className="eyebrow">VAngel Sandbox</p>
          <h1>Робочий зріз із реальним chat API і polling</h1>
          <p className="hero-copy">
            Чат уже ходить у route handlers, тримає сесію локально, вміє
            скидати історію і показує mock-відповіді, якщо webhook ще не
            підключений.
          </p>
        </div>

        <div className="hero-stats compact-stats">
          <div className="stat-card">
            <span className="stat-label">Режим</span>
            <strong>{sending ? "Sending..." : "API wired"}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Контакт</span>
            <strong>{session.contactId}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Webhook</span>
            <strong>{lastStatus}</strong>
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="panel chat-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Chat</p>
              <h2>Instagram Direct Sandbox</h2>
            </div>
            <span className="pill neutral-pill">{messages.length} messages</span>
          </div>

          {error ? <div className="alert-box">{error}</div> : null}

          <div className="messages-list">
            {loadingMessages ? (
              <div className="empty-state">Завантажую історію...</div>
            ) : messages.length ? (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`message-row ${
                    message.author === "client" ? "client-row" : "salon-row"
                  }`}
                >
                  <div
                    className={`message ${
                      message.author === "client" ? "message-client" : "message-salon"
                    }`}
                  >
                    <span className="message-author">
                      {message.author === "client"
                        ? session.contactName
                        : message.author === "system"
                          ? "System"
                          : "VAngel sandbox"}
                    </span>
                    <p>{message.text}</p>
                    <time className="message-time">
                      {new Date(message.timestamp).toLocaleTimeString("uk-UA", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </time>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">Історія порожня. Надішли перше повідомлення.</div>
            )}
          </div>

          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="Введи тестове повідомлення для sandbox..."
            />

            <div className="composer-actions">
              <button type="button" className="secondary-button" onClick={resetConversation}>
                Reset
              </button>
              <button type="submit" className="primary-button" disabled={sending}>
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>

        <div className="center-column">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Settings</p>
                <h2>Сесія та конфігурація</h2>
              </div>
              <span className="panel-note">localStorage + API</span>
            </div>

            <div className="settings-form">
              <label className="field">
                <span>Webhook URL</span>
                <input
                  value={session.webhookUrl}
                  onChange={(event) => updateField("webhookUrl", event.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label className="field">
                <span>Contact ID</span>
                <input
                  value={session.contactId}
                  onChange={(event) => updateField("contactId", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Ім'я клієнта</span>
                <input
                  value={session.contactName}
                  onChange={(event) => updateField("contactName", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Username</span>
                <input
                  value={session.contactUsername}
                  onChange={(event) => updateField("contactUsername", event.target.value)}
                />
              </label>

              <label className="field">
                <span>Persona</span>
                <select
                  value={session.persona}
                  onChange={(event) =>
                    updateField("persona", event.target.value as PersonaOption)
                  }
                >
                  {Object.entries(personaLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="toggle-field">
                <input
                  checked={session.debugPayload}
                  onChange={(event) => updateField("debugPayload", event.target.checked)}
                  type="checkbox"
                />
                <span>Увімкнути raw payload у відповіді</span>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Scenarios</p>
                <h2>Швидкі напрямки тестування</h2>
              </div>
            </div>

            <div className="scenario-list">
              {quickScenarios.map((scenario) => (
                <div key={scenario} className="scenario-item">
                  <strong>{scenario}</strong>
                  <span>Можемо далі перетворити це на кнопки-шаблони.</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Raw Payload</p>
                <h2>Останній debug output</h2>
              </div>
            </div>

            <pre className="payload-box">{prettyPayload}</pre>
          </section>
        </div>

        <aside className="panel trace-column">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Tool Trace</p>
              <h2>Живий журнал інструментів</h2>
            </div>
          </div>

          <div className="trace-list">
            {toolCalls.length ? (
              toolCalls.slice(0, 8).map((item) => (
                <div key={item.id} className="trace-item">
                  <span className={`trace-dot${item.status === "error" ? " error" : ""}`} />
                  <div>
                    <strong>{item.toolName}</strong>
                    <p>
                      {item.status === "error" ? "Помилка" : "Успіх"} ·{" "}
                      {new Date(item.timestamp).toLocaleTimeString("uk-UA", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">Tool trace з’явиться після перших tool calls.</div>
            )}
          </div>

          <div className="trace-section">
            <div className="mini-panel-header">
              <h3>Signals</h3>
              <span className="panel-note">{reviews.length} reviews</span>
            </div>

            <div className="review-list">
              {reviews.length ? (
                reviews.slice(0, 6).map((review) => (
                  <div key={review.id} className={`review-card ${review.severity}`}>
                    <div className="entity-card-row">
                      <strong>{review.severity.toUpperCase()}</strong>
                      <span className="panel-note">
                        {new Date(review.timestamp).toLocaleTimeString("uk-UA", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <p>{review.triggerReasons.join(", ")}</p>
                  </div>
                ))
              ) : (
                <div className="empty-state">Поки немає green/yellow/red сигналів.</div>
              )}
            </div>
          </div>

          <div className="status-box">
            <span className="status-label">Next</span>
            <p>
              Тут тепер видно і tool activity, і review-сигнали по поточному контакту.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}
