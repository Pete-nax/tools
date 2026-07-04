
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding demo data...");

  // ---------- Users ----------
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const [admin, engineer1, engineer2, viewer] = await Promise.all([
    db.user.upsert({
      where: { email: "admin@konnect.co.ke" },
      update: {},
      create: { name: "Wanjiru Kamau", email: "admin@konnect.co.ke", passwordHash, role: "ADMIN" },
    }),
    db.user.upsert({
      where: { email: "brian.otieno@konnect.co.ke" },
      update: {},
      create: { name: "Brian Otieno", email: "brian.otieno@konnect.co.ke", passwordHash, role: "ENGINEER" },
    }),
    db.user.upsert({
      where: { email: "faith.mwangi@konnect.co.ke" },
      update: {},
      create: { name: "Faith Mwangi", email: "faith.mwangi@konnect.co.ke", passwordHash, role: "ENGINEER" },
    }),
    db.user.upsert({
      where: { email: "viewer@konnect.co.ke" },
      update: {},
      create: { name: "Peter Hinga", email: "viewer@konnect.co.ke", passwordHash, role: "VIEWER" },
    }),
  ]);

  console.log(`Users ready. Default password for all seeded accounts: ChangeMe123!`);

  // ---------- Devices ----------
  const deviceDefs = [
    { name: "OLT-Kasarani-01", type: "OLT", host: "10.10.1.1", port: 161, checkType: "TCP", clusterTag: "kasarani", ownerTeam: "Core Network", expectedUptimeTarget: 99.95, failureThreshold: 3 },
    { name: "OLT-Rongai-01", type: "OLT", host: "10.10.2.1", port: 161, checkType: "TCP", clusterTag: "rongai", ownerTeam: "Core Network", expectedUptimeTarget: 99.95, failureThreshold: 3 },
    { name: "ONT-Client-3312", type: "ONT", host: "10.20.5.14", port: 80, checkType: "HTTP", clusterTag: "kasarani", ownerTeam: "Field Ops", expectedUptimeTarget: 99.0, failureThreshold: 5 },
    { name: "ONT-Client-3387", type: "ONT", host: "10.20.5.41", port: 80, checkType: "HTTP", clusterTag: "kasarani", ownerTeam: "Field Ops", expectedUptimeTarget: 99.0, failureThreshold: 5 },
    { name: "Core-Router-Edge01", type: "ROUTER", host: "10.0.0.1", port: 443, checkType: "HTTPS", clusterTag: "core", ownerTeam: "Core Network", expectedUptimeTarget: 99.99, failureThreshold: 2 },
    { name: "Dist-Switch-Rongai-A", type: "SWITCH", host: "10.10.2.10", port: 22, checkType: "TCP", clusterTag: "rongai", ownerTeam: "Core Network", expectedUptimeTarget: 99.9, failureThreshold: 3 },
    { name: "Billing-API-Server", type: "SERVER", host: "api.konnect.co.ke", port: 443, checkType: "HTTPS", clusterTag: "backend", ownerTeam: "Backend", expectedUptimeTarget: 99.9, failureThreshold: 2 },
    { name: "DNS-Resolver-01", type: "SERVER", host: "10.0.0.53", port: 53, checkType: "DNS", clusterTag: "core", ownerTeam: "Core Network", expectedUptimeTarget: 99.99, failureThreshold: 2 },
    { name: "AP-Rongai-Estate-Roof", type: "ACCESS_POINT", host: "10.10.2.50", port: 80, checkType: "HTTP", clusterTag: "rongai", ownerTeam: "Field Ops", expectedUptimeTarget: 98.5, failureThreshold: 4 },
    { name: "AP-Kasarani-Block-C", type: "ACCESS_POINT", host: "10.10.1.60", port: 80, checkType: "HTTP", clusterTag: "kasarani", ownerTeam: "Field Ops", expectedUptimeTarget: 98.5, failureThreshold: 4 },
  ] as const;

  const devices: Record<string, Awaited<ReturnType<typeof db.device.create>>> = {};
  for (const d of deviceDefs) {
    const found = await db.device.findFirst({ where: { name: d.name } });
    devices[d.name] = found ?? (await db.device.create({ data: { ...d } }));
  }

  console.log(`${Object.keys(devices).length} devices ready.`);

  // Skip generating history/tickets/KB if this looks like it already ran.
  const existingTicketCount = await db.ticket.count();
  if (existingTicketCount > 0) {
    console.log("Tickets already exist — skipping diagnostic history, incidents, tickets and KB seed.");
    return;
  }

  // ---------- Diagnostic check history (last ~48h per device) ----------
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;

  for (const device of Object.values(devices)) {
    const flaky = device.name.includes("ONT-Client-3387") || device.name.includes("AP-Rongai");
    const points = [];
    for (let i = 48; i >= 0; i--) {
      const isFailure = flaky ? i <= 4 && i >= 1 : Math.random() < 0.03;
      points.push({
        deviceId: device.id,
        success: !isFailure,
        latencyMs: isFailure ? null : Math.round(8 + Math.random() * 60),
        statusCode: device.checkType === "HTTP" || device.checkType === "HTTPS" ? (isFailure ? 503 : 200) : null,
        errorMessage: isFailure ? "Request timed out after 5000ms" : null,
        timestamp: new Date(now - i * HOUR),
      });
    }
    await db.diagnosticCheck.createMany({ data: points });
  }

  console.log("Diagnostic check history seeded.");

  // ---------- Incidents ----------
  const flakyOnt = devices["ONT-Client-3387"];
  const flakyAp = devices["AP-Rongai-Estate-Roof"];

  const incident1 = await db.incident.create({
    data: {
      deviceId: flakyOnt.id,
      severity: "MAJOR",
      consecutiveFailures: 4,
      startedAt: new Date(now - 4 * HOUR),
      resolvedAt: new Date(now - 1 * HOUR),
      notes: "Repeated optical dropout, resolved after ONT power-cycle by field tech.",
    },
  });

  const incident2 = await db.incident.create({
    data: {
      deviceId: flakyAp.id,
      severity: "MINOR",
      consecutiveFailures: 4,
      startedAt: new Date(now - 3 * HOUR),
      notes: "Intermittent HTTP check failures, likely rooftop AP power fluctuation. Still open.",
    },
  });

  // ---------- Tickets (+ comments) ----------
  const ticketDefs = [
    {
      title: "Client repeatedly losing ONT sync in Kasarani Block C",
      description: "Tenant reports internet drops every evening around 7-9pm. ONT-Client-3387 optical power looks marginal on last two visits.",
      status: "IN_PROGRESS" as const,
      priority: "HIGH" as const,
      category: "PON_OPTICAL" as const,
      clusterTag: "kasarani",
      reporterName: "Tenant - John Kariuki",
      reporterContact: "0722xxxxxx",
      deviceId: flakyOnt.id,
      assigneeId: engineer1.id,
      reporterId: viewer.id,
      incidentId: incident1.id,
    },
    {
      title: "Rooftop AP dropping connected clients in Rongai estate",
      description: "Multiple residents on the Rongai estate AP report disconnects. Suspect power brownout affecting the rooftop unit.",
      status: "ESCALATED" as const,
      priority: "HIGH" as const,
      category: "WIFI_LAN" as const,
      clusterTag: "rongai",
      reporterName: "Field tech - Faith Mwangi",
      deviceId: flakyAp.id,
      assigneeId: engineer2.id,
      reporterId: engineer2.id,
      incidentId: incident2.id,
    },
    {
      title: "M-Pesa callback delays on billing API",
      description: "Daraja B2C callbacks arriving 30-90s late during peak hours, causing delayed payment confirmations.",
      status: "OPEN" as const,
      priority: "CRITICAL" as const,
      category: "BACKEND_API" as const,
      clusterTag: "backend",
      reporterName: "Support desk",
      deviceId: devices["Billing-API-Server"].id,
      assigneeId: engineer1.id,
    },
    {
      title: "New tenant onboarding — VLAN assignment for Block D",
      description: "Set up dedicated VLAN for the newly connected Block D units and confirm DHCP scope has enough leases.",
      status: "OPEN" as const,
      priority: "MEDIUM" as const,
      category: "VLAN" as const,
      clusterTag: "kasarani",
      assigneeId: engineer2.id,
    },
    {
      title: "DHCP lease exhaustion warning on Kasarani pool",
      description: "Monitoring flagged the Kasarani DHCP pool at 92% utilization. Needs scope expansion before it fills.",
      status: "OPEN" as const,
      priority: "MEDIUM" as const,
      category: "DHCP_PPPOE" as const,
      clusterTag: "kasarani",
    },
    {
      title: "Core uplink latency spike investigation",
      description: "Core-Router-Edge01 showed a brief latency spike (400ms+) overnight. Checking upstream provider status.",
      status: "RESOLVED" as const,
      priority: "LOW" as const,
      category: "CORE_UPLINK" as const,
      clusterTag: "core",
      deviceId: devices["Core-Router-Edge01"].id,
      assigneeId: engineer1.id,
      resolvedAt: new Date(now - 20 * HOUR),
    },
    {
      title: "Client CPE replacement request — repeated hardware faults",
      description: "Same unit has failed diagnostics three times this month. Recommend swapping the ONT rather than further truck rolls.",
      status: "CLOSED" as const,
      priority: "LOW" as const,
      category: "ONT_CPE" as const,
      clusterTag: "kasarani",
      assigneeId: engineer2.id,
      resolvedAt: new Date(now - 72 * HOUR),
    },
  ];

  for (const t of ticketDefs) {
    const { ...ticketData } = t;
    const ticket = await db.ticket.create({ data: ticketData });

    await db.ticketComment.create({
      data: {
        ticketId: ticket.id,
        authorId: t.assigneeId ?? admin.id,
        body: "Picked this up — starting investigation, will update once root cause is confirmed.",
      },
    });

    if (t.status === "RESOLVED" || t.status === "CLOSED") {
      await db.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorId: t.assigneeId ?? admin.id,
          body: "Root cause confirmed and fix applied. Closing out — monitoring for recurrence.",
        },
      });
    }
  }

  console.log(`${ticketDefs.length} tickets seeded with comments.`);

  // ---------- Knowledge base articles ----------
  await db.kBArticle.create({
    data: {
      title: "Diagnosing repeated ONT optical resets",
      category: "PON/GPON",
      tags: ["ont", "optical-power", "escalation"],
      authorId: engineer1.id,
      content: [
        { type: "heading", text: "Symptoms" },
        { type: "text", text: "Client reports intermittent drops, ONT LOS light flickers, optical Rx power below -27dBm on the last two readings." },
        { type: "heading", text: "Checklist" },
        { type: "checklist", text: "Confirm optical Rx power at the ONT with a power meter" },
        { type: "checklist", text: "Inspect fiber connector for dust or bend radius violations" },
        { type: "checklist", text: "Check OLT PON port for matching alarms" },
        { type: "code", text: "show interface gpon 0/1 optical-info" },
        { type: "text", text: "If Rx power is below -28dBm and cleaning the connector doesn't help, escalate for a splice check." },
      ],
    },
  });

  await db.kBArticle.create({
    data: {
      title: "M-Pesa Daraja B2C callback troubleshooting",
      category: "Backend/API",
      tags: ["mpesa", "daraja", "billing"],
      authorId: engineer1.id,
      content: [
        { type: "heading", text: "Common causes of delayed callbacks" },
        { type: "text", text: "Safaricom-side queueing during peak hours, our webhook endpoint timing out, or DNS resolution delays on the callback URL." },
        { type: "checklist", text: "Check API server response time on the callback endpoint" },
        { type: "checklist", text: "Confirm callback URL is reachable over HTTPS from outside our network" },
        { type: "checklist", text: "Review Daraja sandbox/production status page" },
        { type: "code", text: "curl -w \"%{time_total}\\n\" -o /dev/null -s https://api.konnect.co.ke/mpesa/callback" },
      ],
    },
  });

  await db.kBArticle.create({
    data: {
      title: "VLAN assignment procedure for new residential blocks",
      category: "Network Config",
      tags: ["vlan", "onboarding", "dhcp"],
      authorId: engineer2.id,
      content: [
        { type: "heading", text: "Steps" },
        { type: "checklist", text: "Allocate next available VLAN ID in the block's cluster range" },
        { type: "checklist", text: "Tag VLAN on the distribution switch uplink port" },
        { type: "checklist", text: "Create DHCP scope sized for expected unit count + 20% headroom" },
        { type: "checklist", text: "Update device inventory with the new cluster tag" },
        { type: "text", text: "Always confirm the DHCP pool utilization on the parent cluster before reusing an existing scope." },
      ],
    },
  });

  console.log("Knowledge base articles seeded.");

  // ---------- Audit log ----------
  await db.auditLog.createMany({
    data: [
      { userId: admin.id, action: "SEED_DEMO_DATA", targetType: "SYSTEM", metadata: { note: "Initial demo dataset created" } },
      { userId: engineer1.id, action: "TICKET_ASSIGNED", targetType: "TICKET", targetId: "seed" },
    ],
  });

  console.log("Demo data seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
