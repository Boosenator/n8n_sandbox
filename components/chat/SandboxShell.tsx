"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  DialogReviewRecord,
  MessageLogRecord,
  ObservabilityEventRecord,
  PersonaOption,
  SandboxMessage,
  SessionPayload,
  SnapshotSource,
  ToolTraceRecord
} from "@/lib/types";

const storageKey = "vangel-sandbox-session";

const initialSession: SessionPayload = {
  webhookUrl: "",
  contactId: "SANDBOX_TEST_0001",
  contactName: "Test client",
  contactUsername: "sandbox_tester",
  persona: "new_client",
  debugPayload: false
};

const quickScenarios = [
  "First contact",
  "Pick a master",
  "Book a service",
  "Reschedule",
  "Cancellation",
  "Escalation"
];

const personaLabels: Record<PersonaOption, string> = {
  new_client: "New client",
  returning: "Returning",
  vip: "VIP",
  complaint: "Complaint"
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

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
  const [messagesLog, setMessagesLog] = useState<MessageLogRecord[]>([]);
  const [events, setEvents] = useState<ObservabilityEventRecord[]>([]);
  const [reviews, setReviews] = useState<DialogReviewRecord[]>([]);
  const [sources, setSources] = useState<{
    messagesLog: SnapshotSource;
    dialogReviews: SnapshotSource;
  }>({
    messagesLog: "local",
    dialogReviews: "local"
  });
  const lastTimestampRef = useRef<number | undefined>(undefined);

  const prettyPayload = useMemo(() => {
    if (!lastPayload) {
      return "No payload captured yet.";
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
      void loadObservability();
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
        throw new Error(data.error ?? "Failed to load messages");
      }

      const items = data.items ?? [];
      setMessages(items);
      lastTimestampRef.current = items.at(-1)?.timestamp;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load messages");
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
          messagesLog?: MessageLogRecord[];
          dialogReviews?: DialogReviewRecord[];
          events?: ObservabilityEventRecord[];
          sources?: {
            messagesLog: SnapshotSource;
            dialogReviews: SnapshotSource;
          };
        };
      };

      if (!response.ok || !data.snapshot) {
        return;
      }

      setToolCalls(data.snapshot.toolCalls ?? []);
      setMessagesLog(data.snapshot.messagesLog ?? []);
      setReviews(data.snapshot.dialogReviews ?? []);
      setEvents(data.snapshot.events ?? []);
      setSources(
        data.snapshot.sources ?? {
          messagesLog: "local",
          dialogReviews: "local"
        }
      );
    } catch {
      // Keep the sidebar quiet on polling errors.
    }
  }

  async function pollMessages() {
    try {
      const suffix = lastTimestampRef.current ? `&since=${lastTimestampRef.current}` : "";
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
        throw new Error(data.error ?? "Failed to send message");
      }

      setDraft("");
      setLastStatus(data.webhookStatus ?? "unknown");
      setLastPayload(data.payload ? JSON.stringify(data.payload, null, 2) : "");
      await loadMessages();
      await loadObservability();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Message send error");
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
        throw new Error(data.error ?? "Failed to reset history");
      }

      setMessages([]);
      setMessagesLog([]);
      setEvents([]);
      setReviews([]);
      lastTimestampRef.current = undefined;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Reset error");
    }
  }

  return (
    <>
      <section className="hero hero-tight">
        <div>
          <p className="eyebrow">VAngel Sandbox</p>
          <h1>Sandbox chat API with polling and DB-backed signals</h1>
          <p className="hero-copy">
            Chat keeps local session state, polls new messages, shows live tool activity, and now
            prefers Supabase reviews and message logs when they are available.
          </p>
        </div>

        <div className="hero-stats compact-stats">
          <div className="stat-card">
            <span className="stat-label">Mode</span>
            <strong>{sending ? "Sending..." : "API wired"}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Contact</span>
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
              <div className="empty-state">Loading conversation...</div>
            ) : messages.length ? (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`message-row ${message.author === "client" ? "client-row" : "salon-row"}`}
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
                    <time className="message-time">{formatTime(message.timestamp)}</time>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">History is empty. Send the first test message.</div>
            )}
          </div>

          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="Type a sandbox message..."
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
                <h2>Session and config</h2>
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
                <span>Client name</span>
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
                  onChange={(event) => updateField("persona", event.target.value as PersonaOption)}
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
                <span>Include raw payload in debug output</span>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Scenarios</p>
                <h2>Quick test paths</h2>
              </div>
            </div>

            <div className="scenario-list">
              {quickScenarios.map((scenario) => (
                <div key={scenario} className="scenario-item">
                  <strong>{scenario}</strong>
                  <span>We can turn this into scripted buttons later.</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Raw Payload</p>
                <h2>Last debug output</h2>
              </div>
            </div>

            <pre className="payload-box">{prettyPayload}</pre>
          </section>
        </div>

        <aside className="panel trace-column">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Tool Trace</p>
              <h2>Live activity</h2>
            </div>
          </div>

          <div className="trace-list">
            {toolCalls.length ? (
              toolCalls.slice(0, 8).map((item) => (
                <div key={item.id} className="list-row">
                  <div className="list-row-main">
                    <span className={`tone-pill ${item.status === "error" ? "red" : "green"}`} />
                    <strong>{item.toolName}</strong>
                    <span className="row-text">{item.status}</span>
                  </div>
                  <span className="row-meta">{formatTime(item.timestamp)}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">Tool trace will appear after the first tool calls.</div>
            )}
          </div>

          <div className="trace-section">
            <div className="mini-panel-header">
              <h3>Signals</h3>
              <span className="panel-note">
                {reviews.length} reviews · {sources.dialogReviews}
              </span>
            </div>

            <div className="review-list">
              {reviews.length ? (
                reviews.slice(0, 6).map((review) => (
                  <div key={review.id} className="list-row">
                    <div className="list-row-main">
                      <span className={`tone-pill ${review.severity}`} />
                      <strong>{review.severity.toUpperCase()}</strong>
                      <span className="row-text">{review.triggerReasons.join(", ")}</span>
                    </div>
                    <span className="row-meta">{formatTime(review.timestamp)}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No green/yellow/red signals for this contact yet.</div>
              )}
            </div>
          </div>

          <div className="trace-section">
            <div className="mini-panel-header">
              <h3>Event Log</h3>
              <span className="panel-note">
                {messagesLog.length} rows · {sources.messagesLog}
              </span>
            </div>

            <div className="event-log">
              {events.length ? (
                events.slice(0, 12).map((item) => (
                  <div key={item.id} className="list-row">
                    <div className="list-row-main">
                      <span className={`tone-pill ${item.tone ?? "neutral"}`} />
                      <strong>{item.title}</strong>
                      <span className="row-text">{item.detail}</span>
                    </div>
                    <span className="row-meta">{formatTime(item.timestamp)}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">Event log will appear after the first dialog steps.</div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
