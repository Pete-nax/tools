import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canEditContent } from "@/lib/rbac";
import { Pencil, Square } from "lucide-react";

export const dynamic = "force-dynamic";

type Block = { type: "heading" | "text" | "checklist" | "code"; text: string };

export default async function KBDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const article = await db.kBArticle.findUnique({ where: { id }, include: { author: true } });
  if (!article) notFound();

  const blocks = article.content as unknown as Block[];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/kb" className="text-xs text-ink-muted hover:text-ink">
            ← Back to knowledge base
          </Link>
          <span className="block text-xs uppercase tracking-wide text-status-info font-mono mt-2">
            {article.category}
          </span>
          <h1 className="text-xl font-semibold text-ink mt-1">{article.title}</h1>
          <p className="text-xs text-ink-faint mt-1.5">
            By {article.author.name} · updated {article.updatedAt.toLocaleString()}
          </p>
        </div>
        {canEditContent(session) && (
          <Link
            href={`/kb/${article.id}/edit`}
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted border border-base-border rounded-lg px-3 py-1.5 hover:text-ink hover:border-status-info/40 transition-colors shrink-0"
          >
            <Pencil size={14} /> Edit
          </Link>
        )}
      </div>

      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {article.tags.map((t) => (
            <span key={t} className="text-xs text-ink-faint bg-base-panel2 px-2.5 py-1 rounded-full">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="bg-base-panel border border-base-border rounded-2xl p-6 space-y-5">
        {blocks.map((block, i) => {
          if (block.type === "heading") {
            return (
              <h2 key={i} className="text-base font-semibold text-ink pt-1">
                {block.text}
              </h2>
            );
          }
          if (block.type === "code") {
            return (
              <pre key={i} className="bg-base-bg border border-base-border rounded-lg p-3.5 overflow-x-auto">
                <code className="text-sm font-mono text-status-up whitespace-pre-wrap">{block.text}</code>
              </pre>
            );
          }
          if (block.type === "checklist") {
            const items = block.text.split("\n").filter((l) => l.trim().length > 0);
            return (
              <ul key={i} className="space-y-1.5">
                {items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-ink-muted">
                    <Square size={14} className="mt-0.5 text-ink-faint shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="text-sm text-ink-muted whitespace-pre-wrap leading-relaxed">
              {block.text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
