import type { SessionPayload } from "@/lib/auth";

export type Role = "ADMIN" | "ENGINEER" | "VIEWER";

const RANK: Record<Role, number> = {
  VIEWER: 0,
  ENGINEER: 1,
  ADMIN: 2,
};

/** True if the session's role meets or exceeds the required role. */
export function hasRole(session: SessionPayload | null, required: Role): boolean {
  if (!session) return false;
  return RANK[session.role] >= RANK[required];
}

export function canEditContent(session: SessionPayload | null): boolean {
  return hasRole(session, "ENGINEER");
}

export function canManageDevices(session: SessionPayload | null): boolean {
  return hasRole(session, "ENGINEER");
}

export function canManageUsers(session: SessionPayload | null): boolean {
  return hasRole(session, "ADMIN");
}

export function canDeleteContent(session: SessionPayload | null): boolean {
  return hasRole(session, "ADMIN");
}
