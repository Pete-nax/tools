"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not post comment");
        setLoading(false);
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={3000}
        placeholder="Add a diagnostic note or update..."
        className="w-full rounded-lg border border-base-border bg-base-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-status-info transition-colors"
      />
      {error && <p className="text-xs text-status-down">{error}</p>}
      <button
        type="submit"
        disabled={loading || !body.trim()}
        className="text-sm font-medium bg-status-info text-white px-4 py-2 rounded-lg hover:bg-status-info/90 disabled:opacity-50 transition-colors"
      >
        {loading ? "Posting..." : "Post note"}
      </button>
    </form>
  );
}
