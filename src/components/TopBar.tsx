import Clock from "@/components/Clock";
import HeartbeatStrip, { type HeartbeatDevice } from "@/components/HeartbeatStrip";
import LogoutButton from "@/components/LogoutButton";
import type { SessionPayload } from "@/lib/auth";

export default function TopBar({
  session,
  devices,
}: {
  session: SessionPayload;
  devices: HeartbeatDevice[];
}) {
  return (
    <header className="h-16 border-b border-base-border bg-base-panel/60 backdrop-blur flex items-center justify-between px-5 gap-4">
      <HeartbeatStrip devices={devices} />

      <div className="flex items-center gap-5">
        <Clock />
        <div className="h-5 w-px bg-base-border" />
        <div className="text-right leading-tight">
          <div className="text-sm text-ink font-medium">{session.name}</div>
          <div className="text-xs text-ink-faint font-mono">{session.role}</div>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
