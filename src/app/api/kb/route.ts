import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canEditContent } from "@/lib/rbac";
import { kbCreateSchema } from "@/lib/validation";
import { writeAudit, getClientIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!canEditContent(session)) {
    return NextResponse.json({ error: "Viewer role cannot create articles" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = kbCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const article = await db.kBArticle.create({
    data: {
      title: data.title,
      category: data.category,
      tags: data.tags,
      content: data.content,
      authorId: session.sub,
    },
  });

  await writeAudit({
    userId: session.sub,
    action: "KB_ARTICLE_CREATED",
    targetType: "KBArticle",
    targetId: article.id,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ article }, { status: 201 });
}
