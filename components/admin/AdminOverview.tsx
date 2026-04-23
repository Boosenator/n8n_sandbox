const tabs = [
  {
    title: "Staff",
    description: "Список майстрів, активність, позиція, фільтри."
  },
  {
    title: "Services",
    description: "Каталог послуг, тривалість, ціни, service ids."
  },
  {
    title: "Schedule",
    description: "Сітка дня, blocked slots, ручні бронювання."
  },
  {
    title: "Bookings",
    description: "Перегляд бронювань від агента та ручних записів."
  },
  {
    title: "Clients",
    description: "Тестові картки клієнтів і пошук по контактних даних."
  },
  {
    title: "Fixtures",
    description: "Seed, export, import і швидкі тестові стани."
  }
];

export function AdminOverview() {
  return (
    <>
      <section className="hero hero-tight compact">
        <div>
          <p className="eyebrow">Mock Admin</p>
          <h1>Структура під керування станом салону</h1>
          <p className="hero-copy">
            Це вже не просто три колонки, а нормальна мапа майбутньої адмінки:
            таби, робоча область і правий борт для дій над fixture-станом.
          </p>
        </div>
      </section>

      <section className="admin-layout">
        <div className="panel admin-tabs">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Sections</p>
              <h2>Основні модулі</h2>
            </div>
          </div>

          <div className="tab-list">
            {tabs.map((tab, index) => (
              <button key={tab.title} className={`tab-item${index === 0 ? " active" : ""}`} type="button">
                <strong>{tab.title}</strong>
                <span>{tab.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel admin-workspace">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Workspace</p>
              <h2>Staff Manager skeleton</h2>
            </div>
            <span className="panel-note">Перший кандидат на імплементацію</span>
          </div>

          <div className="admin-grid">
            <div className="mini-panel tall">
              <h3>List</h3>
              <p>Тут буде таблиця майстрів із status badges, фільтрами і перемикачем active.</p>
            </div>
            <div className="mini-panel tall">
              <h3>Editor</h3>
              <p>Форма створення або редагування майстра: ім'я, позиція, notes, service_ids.</p>
            </div>
          </div>
        </div>

        <aside className="panel admin-side">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Fixture Controls</p>
              <h2>Системні дії</h2>
            </div>
          </div>

          <div className="trace-list">
            <div className="trace-item">
              <span className="trace-dot" />
              <div>
                <strong>Seed defaults</strong>
                <p>Початковий стан VAngel для старту тестів.</p>
              </div>
            </div>
            <div className="trace-item">
              <span className="trace-dot" />
              <div>
                <strong>Export snapshot</strong>
                <p>JSON-експорт усього mock-стану.</p>
              </div>
            </div>
            <div className="trace-item">
              <span className="trace-dot" />
              <div>
                <strong>Import snapshot</strong>
                <p>Відновлення конкретного fixture для edge-case тестів.</p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}
