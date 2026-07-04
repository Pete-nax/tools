import Link from "next/link";
import { db } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { CATEGORY_LABEL } from "@/lib/labels";
import { AlertTriangle, CircleCheck, CircleX, Ticket as TicketIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    openCount,
    criticalCount,
    activeIncidents,
    deviceTotal,
    devicesDown,
    recentTickets,
    openTicketsForCorrelation,
  ] = await Promise.all([
    db.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] } } }),
    db.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] }, priority: "CRITICAL" } }),
    db.incident.findMany({
      where: { resolvedAt: null },
      include: { device: true, ticket: true },
      orderBy: { startedAt: "desc" },
      take: 8,
    }),
    db.device.count({ where: { isActive: true } }),
    db.device.count({
      where: { isActive: true, incidents: { some: { resolvedAt: null } } },
    }),
    db.ticket.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { assignee: true },
    }),
    db.ticket.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] }, clusterTag: { not: null } },
      select: { clusterTag: true, id: true, title: true, priority: true },
    }),
  ]);

  const devicesUp = deviceTotal - devicesDown;

  const clusters = new Map<string, { count: number; tickets: { id: string; title: string; priority: string }[] }>();
  for (const t of openTicketsForCorrelation) {
    if (!t.clusterTag) continue;
    const entry = clusters.get(t.clusterTag) ?? { count: 0, tickets: [] };
    entry.count += 1;
    entry.tickets.push({ id: t.id, title: t.title, priority: t.priority });
    clusters.set(t.clusterTag, entry);
  }
  const correlationAlerts = [...clusters.entries()]
    .filter(([, v]) => v.count > 1)
    .sort((a, b) => b[1].count - a[1].count);

return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Shift overview</h1>
        <p className="text-sm text-ink-muted mt-1">Live state of the network and the queue.</p>
      </div>

      {/* Quick nav — visible on all screen sizes, prominent on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { href: "/tickets",     label: "Tickets",     icon: "🎟️", desc: "Support queue" },
          { href: "/kb",          label: "Knowledge",   icon: "📖", desc: "Articles & guides" },
          { href: "/devices",     label: "Devices",     icon: "🖥️",  desc: "Inventory" },
          { href: "/diagnostics", label: "Diagnostics", icon: "👨🏻‍🔧", desc: "Health checks" },
          { href: "/devices/new", label: "Add device",  icon: "＋",  desc: "Register new" },
        ].map(({ href, label, icon, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-base-panel border border-base-border rounded-xl p-4 flex flex-col gap-2 hover:border-status-info/40 hover:bg-base-panel2 transition-colors"
          >
            <span className="text-2xl">{icon}</span>
            <div>
              <div className="text-sm font-medium text-ink">{label}</div>
              <div className="text-xs text-ink-faint mt-0.5">{desc}</div>
            </div>
          </Link>
        ))}
      </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-base-panel border border-base-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-base-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Active incidents</h2>
            <Link href="/diagnostics" className="text-xs text-status-info hover:underline">
              View diagnostics
            </Link>
          </div>
          {activeIncidents.length === 0 ? (
            <p className="text-sm text-ink-muted px-5 py-8 text-center">
              No active incidents. All monitored devices are reporting normally.
            </p>
          ) : (
            <ul className="divide-y divide-base-border">
              {activeIncidents.map((inc) => (
                <li key={inc.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-ink font-medium">{inc.device.name}</div>
                    <div className="text-xs text-ink-faint font-mono mt-0.5">
                      {inc.device.host} · {inc.consecutiveFailures} failures · since{" "}
                      {inc.startedAt.toLocaleTimeString("en-GB", { hour12: false })}
                    </div>
                  </div>
                  {inc.ticketId && (
                    <Link href={`/tickets/${inc.ticketId}`} className="text-xs text-status-info hover:underline">
                      Ticket →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-base-panel border border-base-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-base-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Recent tickets</h2>
            <Link href="/tickets" className="text-xs text-status-info hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-base-border">
            {recentTickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className="px-5 py-3.5 flex items-center justify-between hover:bg-base-panel2 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-ink font-medium truncate max-w-xs">{t.title}</div>
                    <div className="text-xs text-ink-faint mt-0.5">
                      {CATEGORY_LABEL[t.category]} · {t.assignee?.name ?? "Unassigned"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href: string;
  tone: "info" | "up" | "down";
}) {
  const toneClass = {
    info: "text-status-info",
    up: "text-status-up",
    down: "text-status-down",
  }[tone];

  return (
    <Link
      href={href}
      className="bg-base-panel border border-base-border rounded-2xl p-5 hover:border-status-info/40 transition-colors block"
    >
      <div className={`flex items-center gap-2 ${toneClass}`}>
        {icon}
        <span className="text-xs uppercase tracking-wide text-ink-muted">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-ink mt-3 font-mono">{value}</div>
    </Link>
  );
}
