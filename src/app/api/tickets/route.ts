import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ticketCreateSchema } from "@/lib/validation";
import { writeAudit, getClientIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = ticketCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const data = parsed.data;

  if (data.deviceId) {
    const device = await db.device.findUnique({ where: { id: data.deviceId } });
    if (!device) {
      return NextResponse.json({ error: "Selected device does not exist" }, { status: 400 });
    }
  }

  const ticket = await db.ticket.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority,
      category: data.category,
      clusterTag: data.clusterTag || null,
      deviceId: data.deviceId || null,
      reporterName: data.reporterName || null,
      reporterContact: data.reporterContact || null,
      reporterId: session.sub,
      assigneeId: session.sub,
    },
  });

  await writeAudit({
    userId: session.sub,
    action: "TICKET_CREATED",
    targetType: "Ticket",
    targetId: ticket.id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ticket }, { status: 201 });
}
