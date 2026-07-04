import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canManageDevices } from "@/lib/rbac";
import { performCheckAndLog } from "@/lib/monitor";
import { checkRateLimit } from "@/lib/rateLimit";
import { writeAudit, getClientIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!canManageDevices(session)) {
    return NextResponse.json({ error: "Viewer role cannot run checks" }, { status: 403 });
  }

  if (!checkRateLimit(`device-check:${id}`, 12)) {
    return NextResponse.json({ error: "This device was just checked. Wait a moment and retry." }, { status: 429 });
  }

  const device = await db.device.findUnique({ where: { id } });
  if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

  const outcome = await performCheckAndLog(device);

  await writeAudit({
    userId: session.sub,
    action: "DEVICE_CHECK_RUN",
    targetType: "Device",
    targetId: device.id,
    metadata: { success: outcome.success, latencyMs: outcome.latencyMs },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ outcome });
}
