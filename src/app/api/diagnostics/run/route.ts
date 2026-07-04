import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { runAllActiveDeviceChecks } from "@/lib/monitor";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function runAndRespond() {
  const outcomes = await runAllActiveDeviceChecks();
  const summary = {
    checked: outcomes.length,
    failing: outcomes.filter((o) => !o.success).length,
    incidentsOpened: outcomes.filter((o) => o.incidentOpened).length,
    incidentsResolved: outcomes.filter((o) => o.incidentResolved).length,
  };
  await writeAudit({
    action: "DIAGNOSTIC_SWEEP_RUN",
    targetType: "System",
    metadata: summary,
  });
  return NextResponse.json({ summary, outcomes });
}

// Vercel Cron Jobs call this on schedule (see vercel.json) with a GET
// request and an Authorization: Bearer <CRON_SECRET> header.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  return runAndRespond();
}

// Allows an admin to trigger a sweep on demand from the Diagnostics page.
export async function POST(req: NextRequest) {
  if (isAuthorizedCron(req)) {
    return runAndRespond();
  }
  const session = await getSession();
  if (!session || !hasRole(session, "ADMIN")) {
    return NextResponse.json({ error: "Only admins can trigger a full sweep manually" }, { status: 403 });
  }
  return runAndRespond();
}
