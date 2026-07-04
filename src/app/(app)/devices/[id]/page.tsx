import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageDevices } from "@/lib/rbac";
import { DEVICE_TYPE_LABEL } from "@/lib/labels";
import RunCheckButton from "@/components/RunCheckButton";
import { Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const device = await db.device.findUnique({
    where: { id },
    include: {
      checks: { orderBy: { timestamp: "desc" }, take: 30 },
      incidents: { orderBy: { startedAt: "desc" }, take: 5, include: { ticket: true } },
    },
  });
  if (!device) notFound();

  const total = device.checks.length;
  const successCount = device.checks.filter((c) => c.success).length;
  const observedUptime = total > 0 ? ((successCount / total) * 100).toFixed(1) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/devices" className="text-xs text-ink-muted hover:text-ink">
          ← Back to devices
        </Link>
        <div className="flex items-start justify-between mt-2 gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink">{device.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-xs text-ink-faint font-mono">
              <span>{DEVICE_TYPE_LABEL[device.type]}</span>
              <span>·</span>
              <span>
                {device.host}
                {device.port ? `:${device.port}` : ""}
              </span>
              <span>·</span>
              <span>{device.checkType}</span>
            </div>
          </div>
          {canManageDevices(session) && (
            <Link
              href={`/devices/${device.id}/edit`}
              className="inline-flex items-center gap-1.5 text-sm text-ink-muted border border-base-border rounded-lg px-3 py-1.5 hover:text-ink hover:border-status-info/40 transition-colors shrink-0"
            >
              <Pencil size={14} /> Edit
            </Link>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <MiniStat label="Observed uptime (last 30 checks)" value={observedUptime ? `${observedUptime}%` : "-"} />
        <MiniStat label="Target uptime" value={`${device.expectedUptimeTarget}%`} />
        <MiniStat label="Failure threshold" value={`${device.failureThreshold} checks`} />
      </div>

      {canManageDevices(session) && (
        <div className="bg-base-panel border border-base-border rounded-2xl p-5">
          <RunCheckButton deviceId={device.id} />
        </div>
      )}

      {device.incidents.length > 0 && (
        <div className="bg-base-panel border border-base-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Incident history</h2>
          <ul className="space-y-2">
            {device.incidents.map((inc) => (
              <li key={inc.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">
                  {inc.severity} · {inc.consecutiveFailures} failures ·{" "}
                  {inc.startedAt.toLocaleString()}
                  {inc.resolvedAt ? ` → resolved ${inc.resolvedAt.toLocaleString()}` : " · still open"}
                </span>
                {inc.ticket && (
                  <Link href={`/tickets/${inc.ticket.id}`} className="text-xs text-status-info hover:underline shrink-0">
                    Ticket →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-base-panel border border-base-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-base-border">
          <h2 className="text-sm font-semibold text-ink">Check history</h2>
        </div>
        {device.checks.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-10">No checks logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase tracking-wide border-b border-base-border">
                <th className="px-5 py-2.5 font-medium">Time</th>
                <th className="px-5 py-2.5 font-medium">Result</th>
                <th className="px-5 py-2.5 font-medium">Latency</th>
                <th className="px-5 py-2.5 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border">
              {device.checks.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-2.5 font-mono text-xs text-ink-muted">
                    {c.timestamp.toLocaleString()}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={`text-xs font-medium ${c.success ? "text-status-up" : "text-status-down"}`}>
                      {c.success ? "Success" : "Failed"}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-xs text-ink-muted font-mono">
                    {c.latencyMs != null ? `${c.latencyMs}ms` : "-"}
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-base-panel border border-base-border rounded-2xl p-4">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="text-lg font-semibold text-ink font-mono mt-1">{value}</div>
    </div>
  );
}
