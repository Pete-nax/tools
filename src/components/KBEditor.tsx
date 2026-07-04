"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical } from "lucide-react";

type Block = { type: "heading" | "text" | "checklist" | "code"; text: string };

type ExistingArticle = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  content: Block[];
};

export default function KBEditor({ existing }: { existing?: ExistingArticle }) {
  const router = useRouter();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [tagsInput, setTagsInput] = useState(existing?.tags.join(", ") ?? "");
  const [blocks, setBlocks] = useState<Block[]>(
    existing?.content ?? [{ type: "heading", text: "" }, { type: "text", text: "" }]
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function updateBlock(index: number, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function addBlock(type: Block["type"]) {
    setBlocks((prev) => [...prev, { type, text: "" }]);
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanBlocks = blocks.filter((b) => b.text.trim().length > 0);
    if (cleanBlocks.length === 0) {
      setError("Add at least one block with content");
      return;
    }

    setLoading(true);
    const payload = {
      title,
      category,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      content: cleanBlocks,
    };

    try {
      const res = await fetch(existing ? `/api/kb/${existing.id}` : "/api/kb", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save article");
        setLoading(false);
        return;
      }
      const id = existing?.id ?? data.article.id;
      router.push(`/kb/${id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-base-border bg-base-bg px-3.5 py-2.5 text-ink placeholder:text-ink-faint focus:border-status-info transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-ink-muted mb-1.5">Title</span>
          <input
            required
            minLength={3}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Diagnosing repeated ONT resets"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-ink-muted mb-1.5">Category</span>
          <input
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. GPON, DHCP, Wi-Fi"
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-ink-muted mb-1.5">Tags (comma separated)</span>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="ont, optical-power, escalation"
          className={inputClass}
        />
      </label>

      <div className="space-y-3">
        <span className="block text-sm font-medium text-ink-muted">Content</span>
        {blocks.map((block, i) => (
          <div key={i} className="bg-base-panel border border-base-border rounded-xl p-3.5 group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-ink-faint" />
                <select
                  value={block.type}
                  onChange={(e) => updateBlock(i, { type: e.target.value as Block["type"] })}
                  className="text-xs bg-base-bg border border-base-border rounded px-2 py-1 text-ink-muted"
                >
                  <option value="heading">Heading</option>
                  <option value="text">Text</option>
                  <option value="checklist">Checklist</option>
                  <option value="code">Code</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeBlock(i)}
                className="text-ink-faint hover:text-status-down transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {block.type === "code" ? (
              <textarea
                value={block.text}
                onChange={(e) => updateBlock(i, { text: e.target.value })}
                rows={4}
                placeholder="commands, config snippets..."
                className="w-full bg-base-bg border border-base-border rounded-lg px-3 py-2 font-mono text-sm text-ink"
              />
            ) : block.type === "heading" ? (
              <input
                value={block.text}
                onChange={(e) => updateBlock(i, { text: e.target.value })}
                placeholder="Section heading"
                className="w-full bg-transparent text-base font-semibold text-ink placeholder:text-ink-faint focus:outline-none"
              />
            ) : (
              <textarea
                value={block.text}
                onChange={(e) => updateBlock(i, { text: e.target.value })}
                rows={block.type === "checklist" ? 4 : 3}
                placeholder={
                  block.type === "checklist"
                    ? "One item per line, e.g.\nCheck optical power at ONT\nConfirm VLAN tag on port"
                    : "Write here..."
                }
                className="w-full bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none resize-y"
              />
            )}
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          {(["heading", "text", "checklist", "code"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => addBlock(t)}
              className="text-xs flex items-center gap-1 text-ink-muted border border-base-border rounded-full px-3 py-1.5 hover:text-ink hover:border-status-info/40 transition-colors"
            >
              <Plus size={12} /> {t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-status-down border border-status-down/30 bg-status-down/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-status-info text-white font-medium px-5 py-2.5 rounded-lg hover:bg-status-info/90 disabled:opacity-60 transition-colors"
      >
        {loading ? "Saving..." : existing ? "Save changes" : "Publish article"}
      </button>
    </form>
  );
}
