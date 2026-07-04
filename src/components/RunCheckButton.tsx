"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

export default function RunCheckButton({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/devices/${deviceId}/check`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error ?? "Check failed to run");
      } else {
        setResult(
          data.outcome.success
            ? `Reachable${data.outcome.latencyMs != null ? ` (${data.outcome.latencyMs}ms)` : ""}`
            : `Failed: ${data.outcome.errorMessage ?? "no response"}`
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
        <Zap size={15} />
        {loading ? "Checking..." : "Run check now"}
      </button>
      {result && <p className="text-xs text-ink-muted mt-2">{result}</p>}
    </div>
  );
}
