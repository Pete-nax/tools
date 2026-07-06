// prisma/seed-demo.mjs
// Plain JavaScript — no Prisma engine, no native binaries.
// Run with: node prisma/seed-demo.mjs

import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as fs from "fs";

// Load .env.local manually
const envPath = ".env.local";
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
}

const { Client } = pg;
const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const id = () => crypto.randomUUID();
const now = new Date();
const h = (n) => new Date(Date.now() - n * 3600000);

async function run(sql, params = []) {
  const res = await db.query(sql, params);
  return res.rows;
}

async function main() {
  await db.connect();
  console.log("Connected to database.");

  const hash = await bcrypt.hash("ChangeMe123!", 12);

  // Users
  const adminId = id(), eng1Id = id(), eng2Id = id(), viewerId = id();
  const users = [
    [adminId,   "Wanjiru Kamau",  "admin@konnect.co.ke",              hash, "ADMIN"],
    [eng1Id,    "Brian Otieno",   "brian.otieno@konnect.co.ke",       hash, "ENGINEER"],
    [eng2Id,    "Faith Mwangi",   "faith.mwangi@konnect.co.ke",       hash, "ENGINEER"],
    [viewerId,  "Peter Hinga",    "viewer@konnect.co.ke",             hash, "VIEWER"],
  ];

  for (const [uid, name, email, pw, role] of users) {
    await run(
      `INSERT INTO "User" (id, name, email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5::\"Role\",true,$6,$6)
       ON CONFLICT (email) DO NOTHING`,
      [uid, name, email, pw, role, now]
    );
  }
  console.log("Users ready. Default password: ChangeMe123!");

  // Devices
  const deviceDefs = [
    { name: "OLT-Kasarani-01",        type: "OLT",          host: "10.10.1.1",        port: 161, checkType: "TCP",   cluster: "kasarani", team: "Core Network",  uptime: 99.95, threshold: 3 },
    { name: "OLT-Rongai-01",          type: "OLT",          host: "10.10.2.1",        port: 161, checkType: "TCP",   cluster: "rongai",   team: "Core Network",  uptime: 99.95, threshold: 3 },
    { name: "ONT-Client-3312",        type: "ONT",          host: "10.20.5.14",       port: 80,  checkType: "HTTP",  cluster: "kasarani", team: "Field Ops",     uptime: 99.0,  threshold: 5 },
    { name: "ONT-Client-3387",        type: "ONT",          host: "10.20.5.41",       port: 80,  checkType: "HTTP",  cluster: "kasarani", team: "Field Ops",     uptime: 99.0,  threshold: 5 },
    { name: "Core-Router-Edge01",     type: "ROUTER",       host: "10.0.0.1",         port: 443, checkType: "HTTPS", cluster: "core",     team: "Core Network",  uptime: 99.99, threshold: 2 },
    { name: "Dist-Switch-Rongai-A",   type: "SWITCH",       host: "10.10.2.10",       port: 22,  checkType: "TCP",   cluster: "rongai",   team: "Core Network",  uptime: 99.9,  threshold: 3 },
    { name: "Billing-API-Server",     type: "SERVER",       host: "api.konnect.co.ke",port: 443, checkType: "HTTPS", cluster: "backend",  team: "Backend",       uptime: 99.9,  threshold: 2 },
    { name: "DNS-Resolver-01",        type: "SERVER",       host: "10.0.0.53",        port: 53,  checkType: "DNS",   cluster: "core",     team: "Core Network",  uptime: 99.99, threshold: 2 },
    { name: "AP-Rongai-Estate-Roof",  type: "ACCESS_POINT", host: "10.10.2.50",       port: 80,  checkType: "HTTP",  cluster: "rongai",   team: "Field Ops",     uptime: 98.5,  threshold: 4 },
    { name: "AP-Kasarani-Block-C",    type: "ACCESS_POINT", host: "10.10.1.60",       port: 80,  checkType: "HTTP",  cluster: "kasarani", team: "Field Ops",     uptime: 98.5,  threshold: 4 },
  ];

  const deviceIds = {};
  for (const d of deviceDefs) {
    const existing = await run(`SELECT id FROM "Device" WHERE name=$1`, [d.name]);
    if (existing.length) { deviceIds[d.name] = existing[0].id; continue; }
    const did = id();
    deviceIds[d.name] = did;
    await run(
      `INSERT INTO "Device" (id, name, type, host, port, "checkType", "clusterTag", "ownerTeam",
        "expectedUptimeTarget", "failureThreshold", "isActive", "createdAt", "updatedAt")
       VALUES ($1,$2,$3::\"DeviceType\",$4,$5,$6::\"CheckType\",$7,$8,$9,$10,true,$11,$11)`,
      [did, d.name, d.type, d.host, d.port, d.checkType, d.cluster, d.team, d.uptime, d.threshold, now]
    );
  }
  console.log("Devices ready.");

  // Diagnostic check history (~48h per device)
  const existingChecks = await run(`SELECT COUNT(*) FROM "DiagnosticCheck"`);
  if (parseInt(existingChecks[0].count) === 0) {
    const checks = [];
    for (const [devName, devId] of Object.entries(deviceIds)) {
      const flaky = devName.includes("ONT-Client-3387") || devName.includes("AP-Rongai");
      for (let i = 48; i >= 0; i--) {
        const fail = flaky ? (i <= 4 && i >= 1) : Math.random() < 0.03;
        checks.push([id(), devId, !fail, fail ? null : Math.round(8 + Math.random() * 60), fail ? "Request timed out after 5000ms" : null, h(i)]);
      }
    }
    for (const [cid, devId, success, latency, errMsg, ts] of checks) {
      await run(
        `INSERT INTO "DiagnosticCheck" (id, "deviceId", success, "latencyMs", "errorMessage", timestamp)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [cid, devId, success, latency, errMsg, ts]
      );
    }
    console.log("Diagnostic history seeded.");
  }

  // Incidents
  const inc1Id = id(), inc2Id = id();
  await run(
    `INSERT INTO "Incident" (id, "deviceId", severity, "consecutiveFailures", "startedAt", "resolvedAt", notes)
     VALUES ($1,$2,$3::\"IncidentSeverity\",$4,$5,$6,$7)`,
    [inc1Id, deviceIds["ONT-Client-3387"], "MAJOR", 4, h(4), h(1), "Optical dropout, resolved after ONT power-cycle by field tech."]
  );
  await run(
    `INSERT INTO "Incident" (id, "deviceId", severity, "consecutiveFailures", "startedAt", notes)
     VALUES ($1,$2,$3::\"IncidentSeverity\",$4,$5,$6)`,
    [inc2Id, deviceIds["AP-Rongai-Estate-Roof"], "MINOR", 4, h(3), "Intermittent HTTP check failures, likely rooftop AP power fluctuation. Still open."]
  );

  // Tickets
  const existingTickets = await run(`SELECT COUNT(*) FROM "Ticket"`);
  if (parseInt(existingTickets[0].count) === 0) {
    const tickets = [
      { title: "Client repeatedly losing ONT sync in Kasarani Block C", description: "Tenant reports internet drops every evening. ONT optical power looks marginal.", status: "IN_PROGRESS", priority: "HIGH", category: "PON_OPTICAL", cluster: "kasarani", reporter: "Tenant - John Kariuki", device: "ONT-Client-3387", assignee: eng1Id, rid: viewerId, resolvedAt: null },
      { title: "Rooftop AP dropping connected clients in Rongai estate", description: "Multiple residents report disconnects. Suspect power brownout affecting rooftop unit.", status: "ESCALATED", priority: "HIGH", category: "WIFI_LAN", cluster: "rongai", reporter: "Field tech - Faith Mwangi", device: "AP-Rongai-Estate-Roof", assignee: eng2Id, rid: eng2Id, resolvedAt: null },
      { title: "M-Pesa callback delays on billing API", description: "Daraja B2C callbacks arriving 30-90s late during peak hours.", status: "OPEN", priority: "CRITICAL", category: "BACKEND_API", cluster: "backend", reporter: "Support desk", device: "Billing-API-Server", assignee: eng1Id, rid: null, resolvedAt: null },
      { title: "New tenant onboarding — VLAN assignment for Block D", description: "Set up dedicated VLAN for Block D units and confirm DHCP scope.", status: "OPEN", priority: "MEDIUM", category: "VLAN", cluster: "kasarani", reporter: null, device: null, assignee: eng2Id, rid: null, resolvedAt: null },
      { title: "DHCP lease exhaustion warning on Kasarani pool", description: "Kasarani DHCP pool at 92% utilization. Needs scope expansion.", status: "OPEN", priority: "MEDIUM", category: "DHCP_PPPOE", cluster: "kasarani", reporter: null, device: null, assignee: null, rid: null, resolvedAt: null },
      { title: "Core uplink latency spike investigation", description: "Core-Router-Edge01 showed a brief 400ms+ latency spike overnight.", status: "RESOLVED", priority: "LOW", category: "CORE_UPLINK", cluster: "core", reporter: null, device: "Core-Router-Edge01", assignee: eng1Id, rid: null, resolvedAt: h(20) },
      { title: "Client CPE replacement — repeated hardware faults", description: "Same unit has failed diagnostics three times this month. Recommend ONT swap.", status: "CLOSED", priority: "LOW", category: "ONT_CPE", cluster: "kasarani", reporter: null, device: null, assignee: eng2Id, rid: null, resolvedAt: h(72) },
    ];

    for (const t of tickets) {
      const tid = id();
      await run(
        `INSERT INTO "Ticket" (id, title, description, status, priority, category, "clusterTag",
          "reporterName", "deviceId", "assigneeId", "reporterId", "resolvedAt", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4::\"TicketStatus\",$5::\"TicketPriority\",$6::\"TicketCategory\",$7,$8,$9,$10,$11,$12,$13,$13)`,
        [tid, t.title, t.description, t.status, t.priority, t.category, t.cluster,
          t.reporter, t.device ? deviceIds[t.device] : null, t.assignee, t.rid, t.resolvedAt, now]
      );
      await run(
        `INSERT INTO "TicketComment" (id, "ticketId", "authorId", body, "createdAt")
         VALUES ($1,$2,$3,$4,$5)`,
        [id(), tid, t.assignee ?? adminId, "Picked this up — starting investigation, will update once root cause is confirmed.", now]
      );
      if (t.status === "RESOLVED" || t.status === "CLOSED") {
        await run(
          `INSERT INTO "TicketComment" (id, "ticketId", "authorId", body, "createdAt")
           VALUES ($1,$2,$3,$4,$5)`,
          [id(), tid, t.assignee ?? adminId, "Root cause confirmed and fix applied. Closing out — monitoring for recurrence.", now]
        );
      }
    }
    console.log("Tickets and comments seeded.");
  }

  // KB Articles
  const existingKB = await run(`SELECT COUNT(*) FROM "KBArticle"`);
  if (parseInt(existingKB[0].count) === 0) {
    const articles = [
      {
        title: "Diagnosing repeated ONT optical resets", category: "PON/GPON",
        tags: ["ont", "optical-power", "escalation"], author: eng1Id,
        content: [
          { type: "heading", text: "Symptoms" },
          { type: "text", text: "Client reports intermittent drops, ONT LOS light flickers, optical Rx power below -27dBm." },
          { type: "checklist", text: "Confirm optical Rx power at the ONT with a power meter" },
          { type: "checklist", text: "Inspect fiber connector for dust or bend radius violations" },
          { type: "checklist", text: "Check OLT PON port for matching alarms" },
          { type: "code", text: "show interface gpon 0/1 optical-info" },
          { type: "text", text: "If Rx power is below -28dBm and cleaning doesn't help, escalate for a splice check." },
        ],
      },
      {
        title: "M-Pesa Daraja B2C callback troubleshooting", category: "Backend/API",
        tags: ["mpesa", "daraja", "billing"], author: eng1Id,
        content: [
          { type: "heading", text: "Common causes of delayed callbacks" },
          { type: "text", text: "Safaricom-side queueing during peak hours, webhook endpoint timing out, or DNS delays on the callback URL." },
          { type: "checklist", text: "Check API server response time on the callback endpoint" },
          { type: "checklist", text: "Confirm callback URL is reachable over HTTPS from outside our network" },
          { type: "code", text: 'curl -w "%{time_total}\\n" -o /dev/null -s https://api.konnect.co.ke/mpesa/callback' },
        ],
      },
      {
        title: "VLAN assignment procedure for new residential blocks", category: "Network Config",
        tags: ["vlan", "onboarding", "dhcp"], author: eng2Id,
        content: [
          { type: "heading", text: "Steps" },
          { type: "checklist", text: "Allocate next available VLAN ID in the block's cluster range" },
          { type: "checklist", text: "Tag VLAN on the distribution switch uplink port" },
          { type: "checklist", text: "Create DHCP scope sized for expected unit count + 20% headroom" },
          { type: "checklist", text: "Update device inventory with the new cluster tag" },
          { type: "text", text: "Always confirm the DHCP pool utilization on the parent cluster before reusing an existing scope." },
        ],
      },
    ];

    for (const a of articles) {
      await run(
        `INSERT INTO "KBArticle" (id, title, category, tags, content, "authorId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
        [id(), a.title, a.category, a.tags, JSON.stringify(a.content), a.author, now]
      );
    }
    console.log("Knowledge base articles seeded.");
  }

  console.log("\nDemo data seed complete.");
  console.log("Login with any seeded account using password: ChangeMe123!");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => db.end());

