import { TopNav } from "@/components/shared/TopNav";

export default function AdminPage() {
  return (
    <main className="shell">
      <TopNav />

      <section className="hero compact">
        <div>
          <p className="eyebrow">Mock Admin</p>
          <h1>Окрема сторінка під адмінський інтерфейс</h1>
          <p className="hero-copy">
            Тут далі з&apos;являться таби для майстрів, послуг, клієнтів,
            бронювань та fixture-контролів.
          </p>
        </div>
      </section>

      <section className="admin-columns single-row">
        <div className="mini-panel tall">
          <h2>Staff Manager</h2>
          <p>Порожня колонка під CRUD майстрів.</p>
        </div>
        <div className="mini-panel tall">
          <h2>Services Manager</h2>
          <p>Порожня колонка під каталог послуг.</p>
        </div>
        <div className="mini-panel tall">
          <h2>Schedule / Bookings</h2>
          <p>Порожня колонка під календар, blocked slots і бронювання.</p>
        </div>
      </section>
    </main>
  );
}
