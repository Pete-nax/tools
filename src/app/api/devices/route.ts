import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageDevices } from "@/lib/rbac";
import { deviceCreateSchema } from "@/lib/validation";
import { writeAudit, getClientIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!canManageDevices(session)) {
    return NextResponse.json({ error: "Viewer role cannot register devices" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = deviceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  if (data.checkType === "TCP" && !data.port) {
    return NextResponse.json({ error: "TCP checks require a port" }, { status: 400 });
  }

  const device = await db.device.create({
    data: {
      name: data.name,
      type: data.type,
      host: data.host,
      port: data.port ?? null,
      checkType: data.checkType,
      clusterTag: data.clusterTag || null,
      ownerTeam: data.ownerTeam || null,
      expectedUptimeTarget: data.expectedUptimeTarget,
      failureThreshold: data.failureThreshold,
    },
  });

  await writeAudit({
    userId: session.sub,
    action: "DEVICE_CREATED",
    targetType: "Device",
    targetId: device.id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ device }, { status: 201 });
}
