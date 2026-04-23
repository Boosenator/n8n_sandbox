import { TopNav } from "@/components/shared/TopNav";

const quickScenarios = [
  "Перший контакт",
  "Підбір майстра",
  "Запис на послугу",
  "Перенесення / скасування"
];

const traceItems = [
  "list_services()",
  "list_staff()",
  "get_available_slots()",
  "create_booking()"
];

export default function HomePage() {
  return (
    <main className="shell">
      <TopNav />

      <section className="hero">
        <div>
          <p className="eyebrow">VAngel Sandbox</p>
          <h1>Пустий каркас для тестового салонного сендбоксу</h1>
          <p className="hero-copy">
            Перший екран уже розбитий на основні робочі зони: чат у стилі
            Direct, панель налаштувань, трасування tool-викликів і заготовку
            для mock admin.
          </p>
        </div>

        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-label">Режим</span>
            <strong>Skeleton UI</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Контакт</span>
            <strong>SANDBOX_TEST_0001</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Статус</span>
            <strong>Без API підключення</strong>
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="chat-column panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Chat</p>
              <h2>Instagram Direct Sandbox</h2>
            </div>
            <span className="pill">Порожній стан</span>
          </div>

          <div className="messages-placeholder">
            <div className="message message-salon">
              <span className="message-author">VAngel</span>
              <p>Тут буде стрічка повідомлень агента та клієнта.</p>
            </div>
            <div className="message message-client">
              <span className="message-author">Tester</span>
              <p>
                Нижня зона пізніше стане composer&apos;ом для відправки в
                webhook.
              </p>
            </div>
          </div>

          <div className="composer-placeholder">
            <span>Поле вводу повідомлення</span>
            <button type="button" disabled>
              Send
            </button>
          </div>
        </div>

        <div className="center-column">
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Settings</p>
                <h2>Сесія та конфігурація</h2>
              </div>
            </div>

            <div className="settings-grid">
              <div className="setting-box">
                <span>Webhook URL</span>
                <strong>ще не задано</strong>
              </div>
              <div className="setting-box">
                <span>Persona</span>
                <strong>new_client</strong>
              </div>
              <div className="setting-box">
                <span>Contact ID</span>
                <strong>SANDBOX_TEST_0001</strong>
              </div>
              <div className="setting-box">
                <span>Debug payload</span>
                <strong>off</strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Scenarios</p>
                <h2>Швидкі напрямки тестування</h2>
              </div>
            </div>

            <div className="chips">
              {quickScenarios.map((scenario) => (
                <span key={scenario} className="chip">
                  {scenario}
                </span>
              ))}
            </div>
          </div>

          <div className="panel admin-preview">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Mock Admin</p>
                <h2>Заготовка під керування станом салону</h2>
              </div>
            </div>

            <div className="admin-columns">
              <div className="mini-panel">
                <h3>Staff</h3>
                <p>Список майстрів, статуси, активність.</p>
              </div>
              <div className="mini-panel">
                <h3>Services</h3>
                <p>Каталог послуг і зв&apos;язки з майстрами.</p>
              </div>
              <div className="mini-panel">
                <h3>Schedule</h3>
                <p>Сітка слотів, блокування і ручні бронювання.</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="panel trace-column">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Tool Trace</p>
              <h2>Журнал майбутніх викликів</h2>
            </div>
          </div>

          <div className="trace-list">
            {traceItems.map((item) => (
              <div key={item} className="trace-item">
                <span className="trace-dot" />
                <div>
                  <strong>{item}</strong>
                  <p>Очікує інтеграцію з mock-altegio endpoint.</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
