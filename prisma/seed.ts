import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.log(
      "Skipping admin seed: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your environment to create the first account."
    );
    return;
  }

  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters.");
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin account ${email} already exists. Skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({
    data: { name, email, passwordHash, role: "ADMIN" },
  });

  console.log(`Created admin account for ${email}. Sign in and create further accounts from there.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
