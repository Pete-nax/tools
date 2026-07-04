"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Ticket, BookOpen, Router, Activity } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",   label: "Dashboard",  icon: LayoutDashboard },
  { href: "/tickets",     label: "Tickets",    icon: Ticket },
  { href: "/kb",          label: "KB",         icon: BookOpen },
  { href: "/devices",     label: "Devices",    icon: Router },
  { href: "/diagnostics", label: "Diagnostics",icon: Activity },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-base-panel border-t border-base-border flex">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
              active ? "text-status-info" : "text-ink-faint"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
