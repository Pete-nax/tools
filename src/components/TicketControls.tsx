"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABEL, PRIORITY_LABEL } from "@/lib/labels";

type UserOption = { id: string; name: string };

export default function TicketControls({
  ticketId,
  status,
  priority,
  assigneeId,
  users,
  canEdit,
}: {
  ticketId: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  users: UserOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Update failed");
        setSaving(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server");
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm text-ink focus:border-status-info transition-colors disabled:opacity-50";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1.5">Status</label>
        <select
          value={status}
          disabled={!canEdit || saving}
          onChange={(e) => update({ status: e.target.value })}
          className={selectClass}
        >
          {Object.entries(STATUS_LABEL).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1.5">Priority</label>
        <select
          value={priority}
          disabled={!canEdit || saving}
          onChange={(e) => update({ priority: e.target.value })}
          className={selectClass}
        >
          {Object.entries(PRIORITY_LABEL).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-muted mb-1.5">Assignee</label>
        <select
          value={assigneeId ?? ""}
          disabled={!canEdit || saving}
          onChange={(e) => update({ assigneeId: e.target.value || null })}
          className={selectClass}
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-status-down">{error}</p>}
      {!canEdit && <p className="text-xs text-ink-faint">Viewer role: read-only</p>}
    </div>
  );
}
