"use client";

import { FormEvent, useEffect, useState } from "react";

type PersonaOption = "new_client" | "returning" | "vip" | "complaint";

type Message = {
  id: number;
  author: "client" | "salon";
  text: string;
  time: string;
};

type SessionState = {
  webhookUrl: string;
  contactId: string;
  contactName: string;
  contactUsername: string;
  persona: PersonaOption;
  debugPayload: boolean;
};

const storageKey = "vangel-sandbox-session";

const initialSession: SessionState = {
  webhookUrl: "",
  contactId: "SANDBOX_TEST_0001",
  contactName: "Тестовий клієнт",
  contactUsername: "sandbox_tester",
  persona: "new_client",
  debugPayload: false
};

const initialMessages: Message[] = [
  {
    id: 1,
    author: "salon",
    text: "Сюди пізніше підключимо відповіді з n8n. Поки це локальний sandbox-потік.",
    time: "09:00"
  },
  {
    id: 2,
    author: "client",
    text: "Можна набирати повідомлення і перевіряти базовий ритм інтерфейсу.",
    time: "09:01"
  }
];

const quickScenarios = [
  "Перший контакт",
  "Підбір майстра",
  "Запис на послугу",
  "Перенесення запису",
  "Скасування",
  "Ескалація до майстра"
];

const traceItems = [
  {
    title: "list_services()",
    note: "Піде першим кроком, коли підключимо mock-altegio."
  },
  {
    title: "list_staff()",
    note: "Використаємо для фільтрації майстрів по послугах."
  },
  {
    title: "get_available_slots()",
    note: "Стане джерелом слотів із mock admin."
  },
  {
    title: "create_booking()",
    note: "Поки це тільки майбутній хендлер."
  }
];

const personaLabels: Record<PersonaOption, string> = {
  new_client: "New client",
  returning: "Returning",
  vip: "VIP",
  complaint: "Complaint"
};

export function SandboxShell() {
  const [session, setSession] = useState<SessionState>(initialSession);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SessionState;
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

  function updateField<K extends keyof SessionState>(field: K, value: SessionState[K]) {
    setSession((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = draft.trim();

    if (!text) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        author: "client",
        text,
        time: new Date().toLocaleTimeString("uk-UA", {
          hour: "2-digit",
          minute: "2-digit"
        })
      }
    ]);
    setDraft("");
  }

  function resetConversation() {
    setMessages(initialMessages);
  }

  return (
    <>
      <section className="hero hero-tight">
        <div>
          <p className="eyebrow">VAngel Sandbox</p>
          <h1>Робочий каркас для чату, сесії та mock admin</h1>
          <p className="hero-copy">
            Інтерфейс став спокійнішим і ближчим до внутрішнього тестового
            інструмента. Уже є локальний composer, налаштування сесії та база
            для наступного підключення API.
          </p>
        </div>

        <div className="hero-stats compact-stats">
          <div className="stat-card">
            <span className="stat-label">Режим</span>
            <strong>Local sandbox</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Контакт</span>
            <strong>{session.contactId}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Persona</span>
            <strong>{personaLabels[session.persona]}</strong>
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

          <div className="messages-list">
            {messages.map((message) => (
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
                      : "VAngel sandbox"}
                  </span>
                  <p>{message.text}</p>
                  <time className="message-time">{message.time}</time>
                </div>
              </article>
            ))}
          </div>

          <form className="composer" onSubmit={handleSubmit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              placeholder="Введи тестове повідомлення для локального потоку..."
            />

            <div className="composer-actions">
              <button type="button" className="secondary-button" onClick={resetConversation}>
                Reset
              </button>
              <button type="submit" className="primary-button">
                Add message
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
              <span className="panel-note">Зберігається локально</span>
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
                <span>Увімкнути debug payload</span>
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
                  <span>Шаблон для наступного етапу автозаповнення.</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Admin Preview</p>
                <h2>Структура майбутньої адмінки</h2>
              </div>
            </div>

            <div className="admin-columns">
              <div className="mini-panel">
                <h3>Staff</h3>
                <p>CRUD майстрів і активних змін.</p>
              </div>
              <div className="mini-panel">
                <h3>Services</h3>
                <p>Каталог послуг і матриця прив'язок.</p>
              </div>
              <div className="mini-panel">
                <h3>Schedule</h3>
                <p>Блокування слотів, ручні бронювання, fixtures.</p>
              </div>
            </div>
          </section>
        </div>

        <aside className="panel trace-column">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Tool Trace</p>
              <h2>Майбутній журнал інструментів</h2>
            </div>
          </div>

          <div className="trace-list">
            {traceItems.map((item) => (
              <div key={item.title} className="trace-item">
                <span className="trace-dot" />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.note}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="status-box">
            <span className="status-label">Next</span>
            <p>Наступним кроком сюди заведемо реальний polling і сирі payload-и.</p>
          </div>
        </aside>
      </section>
    </>
  );
}
