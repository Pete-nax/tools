import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canEditContent } from "@/lib/rbac";
import KBEditor from "@/components/KBEditor";

export default async function NewKBArticlePage() {
  const session = await getSession();
  if (!canEditContent(session)) redirect("/kb");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">New article</h1>
        <p className="text-sm text-ink-muted mt-1">Build it in blocks, like a page you&apos;d hand to the next shift.</p>
      </div>
      <KBEditor />
    </div>
  );
}
