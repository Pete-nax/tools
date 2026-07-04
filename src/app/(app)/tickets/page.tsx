import Link from "next/link";
import { db } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import { CATEGORY_LABEL } from "@/lib/labels";
import { Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED"] as const;

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; q?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status && STATUS_FILTERS.includes(params.status as never) ? params.status : "ALL";

  const where: Prisma.TicketWhereInput = {};
  if (statusFilter !== "ALL") where.status = statusFilter as Prisma.TicketWhereInput["status"];
  if (params.priority) where.priority = params.priority as Prisma.TicketWhereInput["priority"];
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { clusterTag: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const tickets = await db.ticket.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: { assignee: true, device: true },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Tickets</h1>
          <p className="text-sm text-ink-muted mt-1">{tickets.length} matching the current filter</p>
        </div>
        <Link
          href="/tickets/new"
          className="inline-flex items-center gap-1.5 bg-status-info text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-status-info/90 transition-colors"
        >
          <Plus size={16} /> New ticket
        </Link>
      </div>

      <form className="flex flex-wrap gap-2" action="/tickets">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/tickets" : `/tickets?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === s
                ? "bg-status-info/15 text-status-info border-status-info/30"
                : "text-ink-muted border-base-border hover:text-ink"
            }`}
          >
            {s === "ALL" ? "All" : s.replace("_", " ")}
          </Link>
        ))}
      </form>

      <div className="bg-base-panel border border-base-border rounded-2xl overflow-hidden">
        {tickets.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-12">No tickets match this filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase tracking-wide border-b border-base-border">
                <th className="px-5 py-3 font-medium">Ticket</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Cluster</th>
                <th className="px-5 py-3 font-medium">Assignee</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-border">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-base-panel2 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/tickets/${t.id}`} className="text-ink font-medium hover:text-status-info">
                      {t.title}
                    </Link>
                    <div className="text-xs text-ink-faint font-mono mt-0.5">
                      #{t.id.slice(-6)} · {t.device?.name ?? "no device"}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted">{CATEGORY_LABEL[t.category]}</td>
                  <td className="px-5 py-3.5 text-ink-muted font-mono text-xs">{t.clusterTag ?? "-"}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{t.assignee?.name ?? "Unassigned"}</td>
                  <td className="px-5 py-3.5">
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={t.status} />
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
