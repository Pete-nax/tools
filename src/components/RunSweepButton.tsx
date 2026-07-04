"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function RunSweepButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/diagnostics/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error ?? "Sweep failed");
      } else {
        setResult(
          `Checked ${data.summary.checked} devices · ${data.summary.failing} failing · ` +
            `${data.summary.incidentsOpened} incidents opened · ${data.summary.incidentsResolved} resolved`
        );
      }
      router.refresh();
    } catch {
      setResult("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleRun}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-sm font-medium bg-status-info text-white px-4 py-2 rounded-lg hover:bg-status-info/90 disabled:opacity-60 transition-colors"
      >
        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        {loading ? "Running sweep..." : "Run full sweep now"}
      </button>
      {result && <p className="text-xs text-ink-muted mt-2">{result}</p>}
    </div>
  );
}
