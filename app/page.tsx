import { SandboxShell } from "@/components/chat/SandboxShell";
import { TopNav } from "@/components/shared/TopNav";

export default function HomePage() {
  return (
    <main className="shell">
      <TopNav />
      <SandboxShell />
    </main>
  );
}
