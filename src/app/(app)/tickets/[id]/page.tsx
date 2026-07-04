import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canEditContent } from "@/lib/rbac";
import StatusBadge from "@/components/StatusBadge";
import PriorityBadge from "@/components/PriorityBadge";
import TicketControls from "@/components/TicketControls";
import CommentForm from "@/components/CommentForm";
import { CATEGORY_LABEL } from "@/lib/labels";

export const dynamic = "force-dynamic";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      device: true,
      assignee: true,
      reporter: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      incidents: { orderBy: { startedAt: "desc" } },
    },
  });

  if (!ticket) notFound();

  const [users, relatedTickets] = await Promise.all([
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ticket.clusterTag
      ? db.ticket.findMany({
          where: { clusterTag: ticket.clusterTag, id: { not: ticket.id } },
          select: { id: true, title: true, status: true, priority: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  const editable = canEditContent(session);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/tickets" className="text-xs text-ink-muted hover:text-ink">
          ← Back to tickets
        </Link>
        <div className="flex items-start justify-between mt-2 gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink">{ticket.title}</h1>
            <div className="flex items-center gap-2 mt-2 text-xs text-ink-faint font-mono">
              <span>#{ticket.id.slice(-6)}</span>
              <span>·</span>
              <span>{CATEGORY_LABEL[ticket.category]}</span>
              {ticket.clusterTag && (
                <>
                  <span>·</span>
                  <span>{ticket.clusterTag}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-base-panel border border-base-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-ink mb-2">Description</h2>
            <p className="text-sm text-ink-muted whitespace-pre-wrap">{ticket.description}</p>
            {ticket.device && (
              <div className="mt-4 pt-4 border-t border-base-border text-sm">
                <span className="text-ink-muted">Related device: </span>
                <Link href={`/devices/${ticket.device.id}`} className="text-status-info hover:underline">
                  {ticket.device.name}
                </Link>
                <span className="text-ink-faint font-mono ml-2">{ticket.device.host}</span>
              </div>
            )}
            {(ticket.reporterName || ticket.reporter) && (
              <div className="mt-2 text-sm text-ink-muted">
                Reported by {ticket.reporter?.name ?? ticket.reporterName}
                {ticket.reporterContact ? ` · ${ticket.reporterContact}` : ""}
              </div>
            )}
          </div>

          {ticket.incidents.length > 0 && (
            <div className="bg-base-panel border border-base-border rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-ink mb-3">Linked diagnostic incidents</h2>
              <ul className="space-y-2">
                {ticket.incidents.map((inc) => (
                  <li key={inc.id} className="text-sm text-ink-muted flex items-center justify-between">
                    <span>
                      {inc.severity} · {inc.consecutiveFailures} consecutive failures
                    </span>
                    <span className="text-xs font-mono text-ink-faint">
                      {inc.resolvedAt ? `resolved ${inc.resolvedAt.toLocaleString()}` : "still open"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-base-panel border border-base-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Activity</h2>
            <ul className="space-y-4 mb-5">
              {ticket.comments.length === 0 && (
                <li className="text-sm text-ink-faint">No notes yet.</li>
              )}
              {ticket.comments.map((c) => (
                <li key={c.id} className="text-sm">
                  <div className="flex items-center gap-2 text-xs text-ink-faint mb-1">
                    <span className="font-medium text-ink-muted">{c.author.name}</span>
                    <span>{c.createdAt.toLocaleString()}</span>
                  </div>
                  <p className="text-ink-muted whitespace-pre-wrap">{c.body}</p>
                </li>
              ))}
            </ul>
            <CommentForm ticketId={ticket.id} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-base-panel border border-base-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-ink mb-4">Controls</h2>
            <TicketControls
              ticketId={ticket.id}
              status={ticket.status}
              priority={ticket.priority}
              assigneeId={ticket.assigneeId}
              users={users}
              canEdit={editable}
            />
          </div>

          {relatedTickets.length > 0 && (
            <div className="bg-status-warn/10 border border-status-warn/30 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-status-warn mb-1">Same cluster</h2>
              <p className="text-xs text-ink-muted mb-3">
                {relatedTickets.length} other ticket(s) tagged {ticket.clusterTag}. Check for a shared
                upstream cause before treating this as isolated.
              </p>
              <ul className="space-y-2">
                {relatedTickets.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tickets/${t.id}`} className="text-xs text-status-info hover:underline block truncate">
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
