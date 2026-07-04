"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  BookOpen,
  Router,
  Activity,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/kb", label: "Knowledge Base", icon: BookOpen },
  { href: "/devices", label: "Devices", icon: Router },
  { href: "/diagnostics", label: "Diagnostics", icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col shrink-0 border-r border-base-border bg-base-panel">
      <div className="h-16 flex items-center gap-2 px-5 border-b border-base-border">
        <span className="h-2.5 w-2.5 rounded-full bg-status-up animate-pulse-soft" />
        <span className="font-mono text-sm tracking-wide text-ink font-medium">KONNECT NOC</span>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-status-info/15 text-status-info font-medium"
                  : "text-ink-muted hover:bg-base-panel2 hover:text-ink"
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-base-border text-xs text-ink-faint font-mono">
        Konnect NOC · v1.0
      </div>
    </aside>
  );
}
