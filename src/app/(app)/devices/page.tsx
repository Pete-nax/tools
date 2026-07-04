import Link from "next/link";
import { db } from "@/lib/db";
import { DEVICE_TYPE_LABEL } from "@/lib/labels";
import { Plus, Router as RouterIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const devices = await db.device.findMany({
    orderBy: { name: "asc" },
    include: {
      checks: { orderBy: { timestamp: "desc" }, take: 1 },
      incidents: { where: { resolvedAt: null }, take: 1 },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Devices</h1>
          <p className="text-sm text-ink-muted mt-1">{devices.length} registered, monitored on a rolling sweep</p>
        </div>
        <Link
          href="/devices/new"
          className="inline-flex items-center gap-1.5 bg-status-info text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-status-info/90 transition-colors"
        >
          <Plus size={16} /> Register device
        </Link>
      </div>

      {devices.length === 0 ? (
        <div className="bg-base-panel border border-base-border rounded-2xl py-16 text-center">
          <RouterIcon className="mx-auto text-ink-faint mb-3" size={28} />
          <p className="text-sm text-ink-muted">No devices registered yet.</p>
        </div>
      ) : (
        <div className="bg-base-panel border border-base-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase tracking-wide border-b border-base-border">
                <th className="px-5 py-3 font-medium">Device</th>
                <th className="px-5 py-3 font-medium">Host</th>
                <th className="px-5 py-3 font-medium">Cluster</th>
                <th className="px-5 py-3 font-medium">Check</th>
                <th className="px-5 py-3 font-medium">Last result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border">
              {devices.map((d) => {
                const lastCheck = d.checks[0];
                const hasOpenIncident = d.incidents.length > 0;
                return (
                  <tr key={d.id} className="hover:bg-base-panel2 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/devices/${d.id}`} className="text-ink font-medium hover:text-status-info">
                        {d.name}
                      </Link>
                      <div className="text-xs text-ink-faint mt-0.5">{DEVICE_TYPE_LABEL[d.type]}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-muted">
                      {d.host}
                      {d.port ? `:${d.port}` : ""}
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted font-mono text-xs">{d.clusterTag ?? "-"}</td>
                    <td className="px-5 py-3.5 text-ink-muted text-xs">{d.checkType}</td>
                    <td className="px-5 py-3.5">
                      {!lastCheck ? (
                        <span className="text-xs text-ink-faint">Not checked yet</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            hasOpenIncident ? "text-status-down" : lastCheck.success ? "text-status-up" : "text-status-warn"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              hasOpenIncident ? "bg-status-down" : lastCheck.success ? "bg-status-up" : "bg-status-warn"
                            }`}
                          />
                          {hasOpenIncident ? "Incident open" : lastCheck.success ? "Reachable" : "Failed"}
                          {lastCheck.latencyMs != null && ` · ${lastCheck.latencyMs}ms`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
