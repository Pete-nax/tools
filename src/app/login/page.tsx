import LoginForm from "@/components/LoginForm";
import "@/login.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/dashboard";

  return (
<main className="min-h-screen flex items-center justify-center bg-base-bg px-4 relative overflow-hidden">
      <div className="login-bg" />
      {/* Signature element: a faint heartbeat trace behind the login panel,
          the same waveform used to represent device health across the app. */}
      <svg
        aria-hidden
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-40 opacity-[0.07]"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
      >
        <path
          d="M0,80 L280,80 L310,20 L340,140 L370,80 L520,80 L550,40 L580,120 L610,80 L1200,80"
          fill="none"
          stroke="#2FBF8F"
          strokeWidth="2"
        />
      </svg>

      <div className="login-panel w-full max-w-sm relative">
       <div className="login-eyebrow mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-status-up animate-pulse-soft" />
            <span className="text-xs uppercase tracking-[0.2em] text-ink-muted font-mono">
              NOC tool
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-ink">Technical Support Workspace</h1>
          <p className="text-sm text-ink-muted mt-1.5">Sign in to your shift</p>
        </div>

        <div className="bg-base-panel border border-base-border rounded-2xl p-7 shadow-panel">
          <LoginForm nextPath={nextPath} />
        </div>

        <p className="text-center text-xs text-ink-faint mt-6 font-mono">
          Tickets · Knowledge base · Device diagnostics
        </p>
      </div>
    </main>
  );
}
