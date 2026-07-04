import Link from "next/link";
import { db } from "@/lib/db";
import { Plus, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function KBListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();

  const articles = await db.kBArticle.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { tags: { has: q } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    include: { author: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Knowledge base</h1>
          <p className="text-sm text-ink-muted mt-1">Write it down once so the next shift doesn&apos;t re-escalate it.</p>
        </div>
        <Link
          href="/kb/new"
          className="inline-flex items-center gap-1.5 bg-status-info text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-status-info/90 transition-colors"
        >
          <Plus size={16} /> New article
        </Link>
      </div>

      <form action="/kb" className="max-w-md">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, category, or tag..."
          className="w-full rounded-lg border border-base-border bg-base-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-status-info transition-colors"
        />
      </form>

      {articles.length === 0 ? (
        <div className="bg-base-panel border border-base-border rounded-2xl py-16 text-center">
          <BookOpen className="mx-auto text-ink-faint mb-3" size={28} />
          <p className="text-sm text-ink-muted">No articles yet. Document the first fix.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/kb/${a.id}`}
              className="bg-base-panel border border-base-border rounded-2xl p-5 hover:border-status-info/40 transition-colors"
            >
              <span className="text-xs uppercase tracking-wide text-status-info font-mono">{a.category}</span>
              <h2 className="text-sm font-semibold text-ink mt-2 mb-2 line-clamp-2">{a.title}</h2>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {a.tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-xs text-ink-faint bg-base-panel2 px-2 py-0.5 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-xs text-ink-faint">
                {a.author.name} · {a.updatedAt.toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
