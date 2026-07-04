import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import { writeAudit, getClientIp } from "@/lib/audit";

export const runtime = "nodejs";

const MAX_ATTEMPTS_PER_MINUTE = 8;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers) ?? "unknown";

  if (!checkRateLimit(`login:${ip}`, MAX_ATTEMPTS_PER_MINUTE)) {
    return NextResponse.json(
      { error: "Too many login attempts. Wait a minute and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });

  // Constant-shape response whether the user exists or not, to avoid
  // leaking which emails are registered.
  const genericError = NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  if (!user || !user.isActive) {
    await writeAudit({ action: "LOGIN_FAILURE", targetType: "User", metadata: { email }, ipAddress: ip });
    return genericError;
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    await writeAudit({
      action: "LOGIN_FAILURE",
      targetType: "User",
      targetId: user.id,
      metadata: { email },
      ipAddress: ip,
    });
    return genericError;
  }

  await setSessionCookie({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  await writeAudit({ action: "LOGIN_SUCCESS", targetType: "User", targetId: user.id, ipAddress: ip });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
