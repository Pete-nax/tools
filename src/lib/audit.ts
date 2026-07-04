import { db } from "@/lib/db";

export async function writeAudit(params: {
  userId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch {
    // Audit logging must never break the primary request flow.
  }
}

export function getClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip");
}
