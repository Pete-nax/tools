import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canEditContent } from "@/lib/rbac";
import { kbUpdateSchema } from "@/lib/validation";
import { writeAudit, getClientIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!canEditContent(session)) {
    return NextResponse.json({ error: "Viewer role cannot edit articles" }, { status: 403 });
  }

  const existing = await db.kBArticle.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Article not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = kbUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const article = await db.kBArticle.update({
    where: { id },
    data: parsed.data,
  });

  await writeAudit({
    userId: session.sub,
    action: "KB_ARTICLE_UPDATED",
    targetType: "KBArticle",
    targetId: article.id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ article });
}
