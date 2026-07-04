import Link from "next/link";

export type HeartbeatDevice = {
  id: string;
  name: string;
  lastSuccess: boolean | null; // null = never checked
};

export default function HeartbeatStrip({ devices }: { devices: HeartbeatDevice[] }) {
  if (devices.length === 0) {
    return <span className="text-xs text-ink-faint font-mono">No devices registered yet</span>;
  }

  const visible = devices.slice(0, 24);
  const overflow = devices.length - visible.length;

  return (
    <Link
      href="/diagnostics"
      className="flex items-center gap-1.5 group"
      title="Live device heartbeat. Click for full diagnostics history."
    >
      {visible.map((d) => (
        <span
          key={d.id}
          className={`h-2 w-2 rounded-full transition-transform group-hover:scale-110 ${
            d.lastSuccess === null
              ? "bg-ink-faint"
              : d.lastSuccess
              ? "bg-status-up"
              : "bg-status-down animate-pulse-soft"
          }`}
        />
      ))}
      {overflow > 0 && <span className="text-xs text-ink-faint font-mono ml-1">+{overflow}</span>}
    </Link>
  );
}
