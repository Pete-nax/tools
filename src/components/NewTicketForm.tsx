"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/lib/labels";

type DeviceOption = { id: string; name: string; clusterTag: string | null };

export default function NewTicketForm({ devices }: { devices: DeviceOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [category, setCategory] = useState("OTHER");
  const [clusterTag, setClusterTag] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterContact, setReporterContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleDeviceChange(id: string) {
    setDeviceId(id);
    const device = devices.find((d) => d.id === id);
    if (device?.clusterTag && !clusterTag) setClusterTag(device.clusterTag);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          category,
          clusterTag,
          deviceId,
          reporterName,
          reporterContact,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create ticket");
        setLoading(false);
        return;
      }
      router.push(`/tickets/${data.ticket.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <Field label="Title">
        <input
          required
          minLength={3}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Repeated PPPoE drops, Zimmerman cluster"
          className={inputClass}
        />
      </Field>

      <Field label="Description">
        <textarea
          required
          minLength={3}
          maxLength={5000}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was reported, what you've checked so far, and what you suspect."
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Priority">
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
            {Object.entries(PRIORITY_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {Object.entries(CATEGORY_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Related device (optional)">
          <select value={deviceId} onChange={(e) => handleDeviceChange(e.target.value)} className={inputClass}>
            <option value="">None</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cluster tag (optional)">
          <input
            value={clusterTag}
            onChange={(e) => setClusterTag(e.target.value)}
            placeholder="e.g. Githurai-44-OLT2"
            maxLength={100}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Reporter name (optional)">
          <input
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            maxLength={150}
            className={inputClass}
          />
        </Field>
        <Field label="Reporter contact (optional)">
          <input
            value={reporterContact}
            onChange={(e) => setReporterContact(e.target.value)}
            maxLength={150}
            className={inputClass}
          />
        </Field>
      </div>

      {error && (
        <p role="alert" className="text-sm text-status-down border border-status-down/30 bg-status-down/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-status-info text-white font-medium px-5 py-2.5 rounded-lg hover:bg-status-info/90 disabled:opacity-60 transition-colors"
        >
          {loading ? "Creating..." : "Create ticket"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-base-border bg-base-bg px-3.5 py-2.5 text-ink placeholder:text-ink-faint focus:border-status-info transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}
