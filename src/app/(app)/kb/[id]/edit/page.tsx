import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canEditContent } from "@/lib/rbac";
import KBEditor from "@/components/KBEditor";

export default async function EditKBArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!canEditContent(session)) redirect(`/kb/${id}`);

  const article = await db.kBArticle.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Edit article</h1>
      </div>
      <KBEditor
        existing={{
          id: article.id,
          title: article.title,
          category: article.category,
          tags: article.tags,
          content: article.content as never,
        }}
      />
    </div>
  );
}
