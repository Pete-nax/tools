"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEVICE_TYPE_LABEL } from "@/lib/labels";

type ExistingDevice = {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number | null;
  checkType: string;
  clusterTag: string | null;
  ownerTeam: string | null;
  expectedUptimeTarget: number;
  failureThreshold: number;
};

export default function DeviceForm({ existing }: { existing?: ExistingDevice }) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState(existing?.type ?? "ONT");
  const [host, setHost] = useState(existing?.host ?? "");
  const [port, setPort] = useState(existing?.port?.toString() ?? "");
  const [checkType, setCheckType] = useState(existing?.checkType ?? "TCP");
  const [clusterTag, setClusterTag] = useState(existing?.clusterTag ?? "");
  const [ownerTeam, setOwnerTeam] = useState(existing?.ownerTeam ?? "");
  const [uptimeTarget, setUptimeTarget] = useState(existing?.expectedUptimeTarget?.toString() ?? "99.9");
  const [failureThreshold, setFailureThreshold] = useState(existing?.failureThreshold?.toString() ?? "3");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (checkType === "TCP" && !port) {
      setError("TCP checks require a port number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(existing ? `/api/devices/${existing.id}` : "/api/devices", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          host,
          port: port ? Number(port) : undefined,
          checkType,
          clusterTag,
          ownerTeam,
          expectedUptimeTarget: Number(uptimeTarget),
          failureThreshold: Number(failureThreshold),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save device");
        setLoading(false);
        return;
      }
      const id = existing?.id ?? data.device.id;
      router.push(`/devices/${id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-base-border bg-base-bg px-3.5 py-2.5 text-ink placeholder:text-ink-faint focus:border-status-info transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Device name">
          <input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. OLT Zimmerman-02"
            className={inputClass}
          />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            {Object.entries(DEVICE_TYPE_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-[2fr_1fr] gap-4">
        <Field label="Host (IP or hostname)">
          <input
            required
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="e.g. 10.20.4.11 or ont-api.internal.network.co.ke"
            className={inputClass + " font-mono"}
          />
        </Field>
        <Field label="Port">
          <input
            type="number"
            min={1}
            max={65535}
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="443"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Check method">
        <select value={checkType} onChange={(e) => setCheckType(e.target.value)} className={inputClass}>
          <option value="TCP">TCP connect (checks a specific port is open)</option>
          <option value="HTTP">HTTP request</option>
          <option value="HTTPS">HTTPS request</option>
          <option value="DNS">DNS resolution</option>
        </select>
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Cluster / PoP tag (optional)">
          <input
            value={clusterTag}
            onChange={(e) => setClusterTag(e.target.value)}
            placeholder="e.g. Githurai 44 OLT2"
            className={inputClass}
          />
        </Field>
        <Field label="Owner team (optional)">
          <input
            value={ownerTeam}
            onChange={(e) => setOwnerTeam(e.target.value)}
            placeholder="e.g. Home Tech, Infrastructure"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Uptime target %">
          <input
            type="number"
            step="0.01"
            min={0}
            max={100}
            value={uptimeTarget}
            onChange={(e) => setUptimeTarget(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Failures before incident">
          <input
            type="number"
            min={1}
            max={20}
            value={failureThreshold}
            onChange={(e) => setFailureThreshold(e.target.value)}
            className={inputClass}
          />
        </Field>
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
        {loading ? "Saving..." : existing ? "Save changes" : "Register device"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}
