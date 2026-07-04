import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import RunSweepButton from "@/components/RunSweepButton";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  const session = await getSession();

  const [activeIncidents, resolvedIncidents, recentChecks, deviceCount] = await Promise.all([
    db.incident.findMany({
      where: { resolvedAt: null },
      include: { device: true, ticket: true },
      orderBy: { startedAt: "desc" },
    }),
    db.incident.findMany({
      where: { resolvedAt: { not: null } },
      include: { device: true },
      orderBy: { resolvedAt: "desc" },
      take: 10,
    }),
    db.diagnosticCheck.findMany({
      orderBy: { timestamp: "desc" },
      take: 40,
      include: { device: true },
    }),
    db.device.count({ where: { isActive: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Diagnostics</h1>
          <p className="text-sm text-ink-muted mt-1">
            {deviceCount} active devices monitored via real TCP/HTTP/DNS checks on a scheduled sweep.
          </p>
        </div>
        {hasRole(session, "ADMIN") && <RunSweepButton />}
      </div>

      <div className="bg-base-panel border border-base-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-base-border">
          <h2 className="text-sm font-semibold text-ink">Active incidents ({activeIncidents.length})</h2>
        </div>
        {activeIncidents.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">Nothing currently failing.</p>
        ) : (
          <ul className="divide-y divide-base-border">
            {activeIncidents.map((inc) => (
              <li key={inc.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <Link href={`/devices/${inc.deviceId}`} className="text-sm text-ink font-medium hover:text-status-info">
                    {inc.device.name}
                  </Link>
                  <div className="text-xs text-ink-faint font-mono mt-0.5">
                    {inc.device.host} · {inc.severity} · {inc.consecutiveFailures} consecutive failures · since{" "}
                    {inc.startedAt.toLocaleString()}
                  </div>
                </div>
                {inc.ticketId && (
                  <Link href={`/tickets/${inc.ticketId}`} className="text-xs text-status-info hover:underline shrink-0">
                    Ticket →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-base-panel border border-base-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-base-border">
          <h2 className="text-sm font-semibold text-ink">Recently resolved</h2>
        </div>
        {resolvedIncidents.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">No resolved incidents yet.</p>
        ) : (
          <ul className="divide-y divide-base-border">
            {resolvedIncidents.map((inc) => (
              <li key={inc.id} className="px-5 py-3 text-sm text-ink-muted flex items-center justify-between">
                <span>{inc.device.name}</span>
                <span className="text-xs font-mono text-ink-faint">
                  {inc.startedAt.toLocaleString()} → {inc.resolvedAt?.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-base-panel border border-base-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-base-border">
          <h2 className="text-sm font-semibold text-ink">Recent check log</h2>
        </div>
        {recentChecks.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-8">
            No checks logged yet. Register a device, then run a check or wait for the next scheduled sweep.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase tracking-wide border-b border-base-border">
                <th className="px-5 py-2.5 font-medium">Time</th>
                <th className="px-5 py-2.5 font-medium">Device</th>
                <th className="px-5 py-2.5 font-medium">Result</th>
                <th className="px-5 py-2.5 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border">
              {recentChecks.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-2.5 font-mono text-xs text-ink-muted">{c.timestamp.toLocaleString()}</td>
                  <td className="px-5 py-2.5">
                    <Link href={`/devices/${c.deviceId}`} className="text-ink hover:text-status-info">
                      {c.device.name}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`text-xs font-medium ${c.success ? "text-status-up" : "text-status-down"}`}>
                      {c.success ? "Success" : "Failed"}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-xs text-ink-faint">
                    {c.statusCode ? `HTTP ${c.statusCode}` : c.errorMessage ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
