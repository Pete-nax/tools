import pg from "pg";
import * as fs from "fs";

if (fs.existsSync(".env.local")) {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const updates = [
  ["admin@konnect.co.ke",        "admin@mail.com"],
  ["brian.otieno@konnect.co.ke", "brian.otieno@mail.com"],
  ["faith.mwangi@konnect.co.ke", "faith.mwangi@mail.com"],
  ["viewer@konnect.co.ke",       "viewer@mail.com"],
];

async function main() {
  await db.connect();
  for (const [oldEmail, newEmail] of updates) {
    const res = await db.query(`UPDATE "User" SET email=$1, "updatedAt"=now() WHERE email=$2`, [newEmail, oldEmail]);
    console.log(res.rowCount > 0 ? `✓ ${oldEmail} → ${newEmail}` : `- ${oldEmail} not found`);
  }
  console.log("Done. Password: ChangeMe123!");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.end());

