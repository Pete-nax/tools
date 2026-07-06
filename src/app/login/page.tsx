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
    <main className="min-h-screen flex items-center justify-center bg-base-void px-4 relative overflow-hidden">
      <div className="login-bg" />

      <div className="login-panel w-full max-w-2xl relative">
        <div className="login-eyebrow mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="login-status-dot h-2.5 w-2.5 rounded-full bg-accent-cyan" />
            <span className="login-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
              NOC tool
            </span>
          </div>
          <h1 className="login-heading text-2xl font-bold text-ink">Gateway</h1>
          <p className="login-subtext login-mono text-sm text-ink-muted mt-1.5">
            Sign in to your shift
          </p>
        </div>

        <div className="login-panel-card px-7 py-8">
          <LoginForm nextPath={nextPath} />
        </div>

        <p className="login-footnote login-mono text-center text-xs text-ink-faint mt-6">
          Tickets · Knowledge base · Device diagnostics
        </p>
      </div>
    </main>
  );
}
