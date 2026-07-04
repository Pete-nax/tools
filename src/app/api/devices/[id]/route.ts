import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageDevices, canDeleteContent } from "@/lib/rbac";
import { deviceUpdateSchema } from "@/lib/validation";
import { writeAudit, getClientIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!canManageDevices(session)) {
    return NextResponse.json({ error: "Viewer role cannot edit devices" }, { status: 403 });
  }

  const existing = await db.device.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Device not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = deviceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const device = await db.device.update({
    where: { id },
    data: {
      ...data,
      clusterTag: data.clusterTag === undefined ? undefined : data.clusterTag || null,
      ownerTeam: data.ownerTeam === undefined ? undefined : data.ownerTeam || null,
    },
  });

  await writeAudit({
    userId: session.sub,
    action: "DEVICE_UPDATED",
    targetType: "Device",
    targetId: device.id,
    metadata: { changes: data },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ device });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!canDeleteContent(session)) {
    return NextResponse.json({ error: "Only admins can remove devices" }, { status: 403 });
  }

  const existing = await db.device.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Device not found" }, { status: 404 });

  await db.device.delete({ where: { id } });

  await writeAudit({
    userId: session.sub,
    action: "DEVICE_DELETED",
    targetType: "Device",
    targetId: id,
    metadata: { name: existing.name },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ ok: true });
}
