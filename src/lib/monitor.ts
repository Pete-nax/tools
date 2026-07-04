import { db } from "@/lib/db";
import { runCheck } from "@/lib/diagnostics";
import { writeAudit } from "@/lib/audit";
import type { Device, TicketCategory } from "@prisma/client";

const CATEGORY_BY_DEVICE_TYPE: Record<string, TicketCategory> = {
  OLT: "PON_OPTICAL",
  ONT: "ONT_CPE",
  ROUTER: "CORE_UPLINK",
  SWITCH: "CORE_UPLINK",
  SERVER: "BACKEND_API",
  ACCESS_POINT: "WIFI_LAN",
  OTHER: "OTHER",
};

const CRITICAL_DEVICE_TYPES = new Set(["OLT", "ROUTER", "SERVER"]);

export type CheckOutcome = {
  deviceId: string;
  deviceName: string;
  success: boolean;
  latencyMs: number | null;
  statusCode: number | null;
  errorMessage: string | null;
  incidentOpened: boolean;
  incidentResolved: boolean;
  ticketId: string | null;
};

/**
 * Executes a real reachability check for one device, logs the result to
 * DiagnosticCheck history, and applies incident detection rules:
 *  - N consecutive failures (device.failureThreshold) with no open
 *    incident -> opens an Incident and auto-creates a linked Ticket.
 *  - A success while an incident is open -> resolves the incident.
 */
export async function performCheckAndLog(device: Device): Promise<CheckOutcome> {
  const result = await runCheck(device.checkType, device.host, device.port);

  await db.diagnosticCheck.create({
    data: {
      deviceId: device.id,
      success: result.success,
      latencyMs: result.latencyMs,
      statusCode: result.statusCode,
      errorMessage: result.errorMessage,
    },
  });

  const openIncident = await db.incident.findFirst({
    where: { deviceId: device.id, resolvedAt: null },
    orderBy: { startedAt: "desc" },
  });

  let incidentOpened = false;
  let incidentResolved = false;
  let ticketId: string | null = null;

  if (result.success) {
    if (openIncident) {
      await db.incident.update({
        where: { id: openIncident.id },
        data: { resolvedAt: new Date() },
      });
      incidentResolved = true;

      if (openIncident.ticketId) {
        const ticket = await db.ticket.findUnique({ where: { id: openIncident.ticketId } });
        if (ticket && (ticket.status === "OPEN" || ticket.status === "IN_PROGRESS")) {
          await db.ticket.update({
            where: { id: openIncident.ticketId },
            data: {
              status: "RESOLVED",
              resolvedAt: new Date(),
            },
          });
          await db.ticketComment.create({
            data: {
              ticketId: openIncident.ticketId,
              authorId: await getSystemAuthorId(),
              body: `Diagnostic monitor detected the device is reachable again. Auto-marked resolved.`,
            },
          });
        }
      }
      await writeAudit({
        action: "INCIDENT_AUTO_RESOLVED",
        targetType: "Incident",
        targetId: openIncident.id,
        metadata: { deviceId: device.id, deviceName: device.name },
      });
    }
    return {
      deviceId: device.id,
      deviceName: device.name,
      success: true,
      latencyMs: result.latencyMs,
      statusCode: result.statusCode,
      errorMessage: null,
      incidentOpened,
      incidentResolved,
      ticketId,
    };
  }

  // Failure path: count how many of the most recent checks failed consecutively.
  const recentChecks = await db.diagnosticCheck.findMany({
    where: { deviceId: device.id },
    orderBy: { timestamp: "desc" },
    take: device.failureThreshold,
  });

  const consecutiveFailures = countConsecutiveFailures(recentChecks);

  if (!openIncident && consecutiveFailures >= device.failureThreshold) {
    const severity = CRITICAL_DEVICE_TYPES.has(device.type) ? "CRITICAL" : "MAJOR";

    const systemAuthorId = await getSystemAuthorId();

    const ticket = await db.ticket.create({
      data: {
        title: `Automatic: ${device.name} is unreachable`,
        description:
          `Diagnostic monitor recorded ${consecutiveFailures} consecutive failed ${device.checkType} checks ` +
          `against ${device.host}${device.port ? `:${device.port}` : ""}.\n\n` +
          `Last error: ${result.errorMessage ?? "no response"}\n` +
          `This ticket was opened automatically. Investigate the device and correlate with other ` +
          `open tickets sharing the same cluster tag before treating this as an isolated fault.`,
        priority: severity === "CRITICAL" ? "CRITICAL" : "HIGH",
        category: CATEGORY_BY_DEVICE_TYPE[device.type] ?? "OTHER",
        clusterTag: device.clusterTag,
        deviceId: device.id,
        reporterName: "Diagnostic Monitor",
        reporterId: systemAuthorId,
      },
    });

    const incident = await db.incident.create({
      data: {
        deviceId: device.id,
        severity,
        consecutiveFailures,
        ticketId: ticket.id,
        notes: result.errorMessage,
      },
    });

    incidentOpened = true;
    ticketId = ticket.id;

    await writeAudit({
      action: "INCIDENT_AUTO_OPENED",
      targetType: "Incident",
      targetId: incident.id,
      metadata: { deviceId: device.id, deviceName: device.name, ticketId: ticket.id, consecutiveFailures },
    });
  } else if (openIncident) {
    await db.incident.update({
      where: { id: openIncident.id },
      data: { consecutiveFailures },
    });
  }

  return {
    deviceId: device.id,
    deviceName: device.name,
    success: false,
    latencyMs: result.latencyMs,
    statusCode: result.statusCode,
    errorMessage: result.errorMessage,
    incidentOpened,
    incidentResolved,
    ticketId,
  };
}

function countConsecutiveFailures(checksNewestFirst: { success: boolean }[]): number {
  let count = 0;
  for (const check of checksNewestFirst) {
    if (!check.success) count += 1;
    else break;
  }
  return count;
}

let cachedSystemAuthorId: string | null = null;

/**
 * The monitor needs a User row to attribute automated tickets/comments to.
 * Ensures a single non-login "system" account exists rather than allowing
 * null authorship, which keeps audit trails and the UI consistent.
 */
async function getSystemAuthorId(): Promise<string> {
  if (cachedSystemAuthorId) return cachedSystemAuthorId;

  const existing = await db.user.findUnique({ where: { email: "monitor@system.local" } });
  if (existing) {
    cachedSystemAuthorId = existing.id;
    return existing.id;
  }

  const created = await db.user.create({
    data: {
      name: "Diagnostic Monitor",
      email: "monitor@system.local",
      passwordHash: "!disabled!", // not a valid bcrypt hash; this account can never log in
      role: "VIEWER",
      isActive: false,
    },
  });
  cachedSystemAuthorId = created.id;
  return created.id;
}

export async function runAllActiveDeviceChecks(): Promise<CheckOutcome[]> {
  const devices = await db.device.findMany({ where: { isActive: true } });
  const outcomes: CheckOutcome[] = [];
  // Sequential, not parallel: keeps outbound connection load predictable
  // and avoids overwhelming small devices with a burst of simultaneous probes.
  for (const device of devices) {
    try {
      outcomes.push(await performCheckAndLog(device));
    } catch (err) {
      outcomes.push({
        deviceId: device.id,
        deviceName: device.name,
        success: false,
        latencyMs: null,
        statusCode: null,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        incidentOpened: false,
        incidentResolved: false,
        ticketId: null,
      });
    }
  }
  return outcomes;
}
