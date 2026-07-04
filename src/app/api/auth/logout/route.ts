import { NextRequest, NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth";
import { writeAudit, getClientIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  await clearSessionCookie();
  if (session) {
    await writeAudit({
      action: "LOGOUT",
      targetType: "User",
      targetId: session.sub,
      ipAddress: getClientIp(req.headers),
    });
  }
  return NextResponse.json({ ok: true });
}
