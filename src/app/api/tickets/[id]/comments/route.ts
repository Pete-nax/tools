import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { commentCreateSchema } from "@/lib/validation";
import { writeAudit, getClientIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ticket = await db.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = commentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const comment = await db.ticketComment.create({
    data: {
      ticketId: id,
      authorId: session.sub,
      body: parsed.data.body,
    },
    include: { author: true },
  });

  await writeAudit({
    userId: session.sub,
    action: "TICKET_COMMENT_ADDED",
    targetType: "Ticket",
    targetId: id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ comment }, { status: 201 });
}
