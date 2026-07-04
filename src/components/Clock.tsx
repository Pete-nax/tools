"use client";

import { useEffect, useState } from "react";

export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    // Avoid a server/client markup mismatch: render nothing until mounted.
    return <span className="font-mono text-sm text-ink-muted w-24 inline-block" />;
  }

  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  const date = now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <span className="font-mono text-sm text-ink-muted whitespace-nowrap">
      {date} <span className="text-ink">{time}</span>
    </span>
  );
}
