"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  DialogReviewRecord,
  ObservabilityEventRecord,
  PersonaOption,
  SandboxMessage,
  SessionPayload,
  SnapshotSource,
  ToolTraceRecord
} from "@/lib/types";

const storageKey = "vangel-sandbox-session";

const initialSession: SessionPayload = {
  webhookUrlTest: "",
  webhookUrlProd: "",
  webhookEnv: "test",
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

function toneClass(tone?: "green" | "yellow" | "red" | "neutral") {
  if (tone === "green" || tone === "yellow" || tone === "red") {
    return tone;
  }

  return "gray";
}

export function SandboxShell() {
  const [session, setSession] = useState<SessionPayload>(initialSession);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<SandboxMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const sending = pendingCount > 0;
  const [lastPayload, setLastPayload] = useState<string>("");
  const [lastStatus, setLastStatus] = useState<string>("idle");
  const [error, setError] = useState<string>("");
  const [toolCalls, setToolCalls] = useState<ToolTraceRecord[]>([]);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  function handleMessagesScroll() {
    const el = messagesContainerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  useEffect(() => {
    if (!loadingMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      isAtBottomRef.current = true;
    }
  }, [loadingMessages]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

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

      setMessages((current) => {
        const existingIds = new Set(current.map((m) => m.id));
        const fresh = data.items!.filter((m) => !existingIds.has(m.id));
        return fresh.length ? [...current, ...fresh] : current;
      });
      lastTimestampRef.current = data.items.at(-1)?.timestamp;
    } catch {
      // Ignore polling errors to keep the UI calm.
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void fireMessage(draft);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && event.ctrlKey) {
      event.preventDefault();
      void fireMessage(draft);
    }
  }

  async function fireMessage(raw: string) {
    const text = raw.trim();

    if (!text) {
      return;
    }

    const activeWebhookUrl = session.webhookEnv === "prod"
      ? session.webhookUrlProd
      : session.webhookUrlTest;

    setDraft("");
    setPendingCount((c) => c + 1);
    setError("");

    try {
      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...session,
          webhookUrl: activeWebhookUrl,
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

      setLastStatus(data.webhookStatus ?? "unknown");
      setLastPayload(data.payload ? JSON.stringify(data.payload, null, 2) : "");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Message send error");
    } finally {
      setPendingCount((c) => c - 1);
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
      setEvents([]);
      setReviews([]);
      lastTimestampRef.current = undefined;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Reset error");
    }
  }

  return (
    <section className="admin-console chat-admin-console">
      <aside className="admin-sidebar chat-admin-sidebar">
        <div className="admin-sidebar-logo">Chat Sandbox</div>

        <div className="admin-sidebar-group">
          <div className="admin-sidebar-group-title">Session</div>
          <div className="chat-sidebar-body">
            <div className="chat-admin-field">
              <span>Environment</span>
              <div className="chat-env-toggle">
                <button
                  type="button"
                  className={`chat-env-btn${session.webhookEnv === "test" ? " active" : ""}`}
                  onClick={() => updateField("webhookEnv", "test")}
                >
                  Test
                </button>
                <button
                  type="button"
                  className={`chat-env-btn${session.webhookEnv === "prod" ? " active" : ""}`}
                  onClick={() => updateField("webhookEnv", "prod")}
                >
                  Prod
                </button>
              </div>
            </div>
            <label className="chat-admin-field">
              <span>Test webhook URL</span>
              <input
                value={session.webhookUrlTest}
                onChange={(event) => updateField("webhookUrlTest", event.target.value)}
                placeholder="https://.../webhook/test/..."
              />
            </label>
            <label className="chat-admin-field">
              <span>Prod webhook URL</span>
              <input
                value={session.webhookUrlProd}
                onChange={(event) => updateField("webhookUrlProd", event.target.value)}
                placeholder="https://.../webhook/prod/..."
              />
            </label>
            <label className="chat-admin-field">
              <span>Contact ID</span>
              <input
                value={session.contactId}
                onChange={(event) => updateField("contactId", event.target.value)}
              />
            </label>
            <label className="chat-admin-field">
              <span>Client name</span>
              <input
                value={session.contactName}
                onChange={(event) => updateField("contactName", event.target.value)}
              />
            </label>
            <label className="chat-admin-field">
              <span>Username</span>
              <input
                value={session.contactUsername}
                onChange={(event) => updateField("contactUsername", event.target.value)}
              />
            </label>
            <label className="chat-admin-field">
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
            <label className="chat-admin-check">
              <input
                checked={session.debugPayload}
                onChange={(event) => updateField("debugPayload", event.target.checked)}
                type="checkbox"
              />
              <span>Include raw payload in debug output</span>
            </label>
          </div>
        </div>

        <div className="admin-sidebar-group">
          <div className="admin-sidebar-group-title">Scenarios</div>
          <div className="chat-sidebar-body">
            {quickScenarios.map((scenario) => (
              <div key={scenario} className="chat-sidebar-scenario">
                <strong>{scenario}</strong>
                <span>Quick manual path for testing the flow.</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <div className="admin-classic-topbar">
          <div className="admin-classic-brand">
            Chat Sandbox <span>·</span> Live webhook, messages and signals
          </div>
          <div className="admin-classic-spacer" />
          <span className="chat-status-chip">contact {session.contactId}</span>
          <span className="chat-status-chip">webhook {lastStatus}</span>
          <span className="chat-status-chip">{sending ? "sending" : "ready"}</span>
        </div>

        <div className="admin-content chat-admin-content">
          <div className="admin-page-header">
            <div className="admin-page-title-row">
              <h1>Instagram Direct Sandbox</h1>
              <span className="admin-page-note">
                {messages.length} messages · reviews {sources.dialogReviews} · log {sources.messagesLog}
              </span>
            </div>
            <p className="admin-page-description">
              Control the session on the left, send messages from the center, and review tool traces
              plus Recent Event Log on the right.
            </p>
          </div>

          {error ? <div className="admin-notice">{error}</div> : null}

          <div className="chat-admin-grid">
            <section className="chat-workspace-panel">
              <div className="chat-workspace-head">
                <div>
                  <div className="chat-workspace-title">Conversation</div>
                  <div className="chat-workspace-subtitle">Supabase-backed message stream</div>
                </div>
                <span className="admin-badge admin-badge-blue">{messages.length} rows</span>
              </div>

              <div
                className="chat-messages-board"
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
              >
                {loadingMessages ? (
                  <div className="empty-state">Loading conversation...</div>
                ) : messages.length ? (
                  messages.map((message) => (
                    <article
                      key={message.id}
                      className={`chat-admin-row ${message.author === "client" ? "client-row" : "salon-row"}`}
                    >
                      <div
                        className={`chat-admin-bubble ${
                          message.author === "client"
                            ? "message-client"
                            : message.author === "system"
                              ? "message-system"
                              : "message-salon"
                        }`}
                      >
                        <span className="message-author">
                          {message.author === "client"
                            ? session.contactName
                            : message.author === "system"
                              ? "System"
                              : "VAngel"}
                        </span>
                        <p>{message.text}</p>
                        <time className="message-time">{formatTime(message.timestamp)}</time>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">History is empty. Send the first sandbox message.</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="chat-admin-composer" onSubmit={handleSubmit}>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={4}
                  placeholder="Type a sandbox message... (Ctrl+Enter to send)"
                />
                <div className="chat-admin-composer-actions">
                  <button type="button" className="admin-btn admin-btn-gray" onClick={resetConversation}>
                    Reset
                  </button>
                  <button type="submit" className="admin-btn admin-btn-green">
                    Send
                  </button>
                </div>
              </form>
            </section>

            <aside className="chat-observability-column">
              <section className="admin-page-block">
                <div className="admin-page-title">
                  <span>Tool Trace</span>
                  <span className="admin-page-subtitle">{toolCalls.length} rows</span>
                </div>
                <div className="admin-plain-list">
                  {toolCalls.length ? (
                    toolCalls.slice(0, 8).map((item) => (
                      <div key={item.id} className="admin-plain-row">
                        <span
                          className={`admin-badge ${
                            item.status === "error" ? "admin-badge-red" : "admin-badge-green"
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="chat-observability-label">{item.toolName}</span>
                        <span className="admin-toolbar-spacer" />
                        <span className="admin-page-note">{formatTime(item.timestamp)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="admin-plain-row">
                      <span>No tool activity yet.</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="admin-page-block">
                <div className="admin-page-title">
                  <span>Signals</span>
                  <span className="admin-page-subtitle">
                    {reviews.length} rows · {sources.dialogReviews}
                  </span>
                </div>
                <div className="admin-plain-list">
                  {reviews.length ? (
                    reviews.slice(0, 6).map((review) => (
                      <div key={review.id} className="admin-plain-row">
                        <span className={`admin-badge admin-badge-${review.severity}`}>
                          {review.severity}
                        </span>
                        <span className="chat-observability-label">
                          {review.triggerReasons.join(", ")}
                        </span>
                        <span className="admin-toolbar-spacer" />
                        <span className="admin-page-note">{formatTime(review.timestamp)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="admin-plain-row">
                      <span>No signals for this contact yet.</span>
                    </div>
                  )}
                </div>
              </section>

              <section className="admin-page-block">
                <div className="admin-page-title">
                  <span>Recent Event Log</span>
                  <span className="admin-page-subtitle">
                    {events.length} rows · {sources.messagesLog}
                  </span>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Type</th>
                        <th>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.length ? (
                        events.slice(0, 14).map((item) => (
                          <tr key={item.id}>
                            <td className="muted-cell">{formatTime(item.timestamp)}</td>
                            <td>
                              <span className={`admin-badge admin-badge-${toneClass(item.tone)}`}>
                                {item.kind}
                              </span>
                            </td>
                            <td>
                              <div className="chat-event-title">{item.title}</div>
                              <div className="muted-cell">{item.detail}</div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="muted-cell">
                            Event log will appear after the first dialog steps.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="admin-page-block">
                <div className="admin-page-title">
                  <span>Raw Payload</span>
                  <span className="admin-page-subtitle">Last debug output</span>
                </div>
                <pre className="payload-box chat-payload-box">{prettyPayload}</pre>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
