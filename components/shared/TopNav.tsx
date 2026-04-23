"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Chat Sandbox" },
  { href: "/admin", label: "Mock Admin" }
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="top-nav">
      <div className="brand">
        <strong>VAngel</strong>
        <span>Sandbox control surface</span>
      </div>

      <div className="nav-links">
        {links.map((link) => {
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${isActive ? " active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
