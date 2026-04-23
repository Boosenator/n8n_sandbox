import { AdminOverview } from "@/components/admin/AdminOverview";
import { TopNav } from "@/components/shared/TopNav";

export default function AdminPage() {
  return (
    <main className="shell">
      <TopNav />
      <AdminOverview />
    </main>
  );
}
