import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ticketUpdateSchema } from "@/lib/validation";
import { writeAudit, getClientIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const existing = await db.ticket.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = ticketUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  if (data.assigneeId) {
    const assignee = await db.user.findUnique({ where: { id: data.assigneeId } });
    if (!assignee) return NextResponse.json({ error: "Selected assignee does not exist" }, { status: 400 });
  }

  const isResolving = data.status === "RESOLVED" || data.status === "CLOSED";
  const wasOpen = existing.status !== "RESOLVED" && existing.status !== "CLOSED";

  const ticket = await db.ticket.update({
    where: { id },
    data: {
      ...data,
      clusterTag: data.clusterTag === undefined ? undefined : data.clusterTag || null,
      assigneeId: data.assigneeId === undefined ? undefined : data.assigneeId || null,
      resolvedAt: isResolving && wasOpen ? new Date() : data.status && !isResolving ? null : undefined,
    },
  });

  await writeAudit({
    userId: session.sub,
    action: "TICKET_UPDATED",
    targetType: "Ticket",
    targetId: ticket.id,
    metadata: { changes: data },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ticket });
}
