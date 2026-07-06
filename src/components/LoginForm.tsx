"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DemoAccount = {
  id: string;
  role: "ADMIN" | "ENGINEER" | "VIEWER";
  label: string;
  email: string;
  password: string;
};

/**
 * Demo credential keyring — ONLY for non-production sandboxes.
 * Gated behind NEXT_PUBLIC_ENABLE_DEMO_LOGIN so real deployments never
 * ship working credentials (including an admin account) to the client.
 * Set NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true in a local/staging .env only.
 */
const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "admin", role: "ADMIN", label: "Admin", email: "admin@mail.com", password: "ChangeMe123!" },
  { id: "eng-1", role: "ENGINEER", label: "Engineer: brian.otieno", email: "brian.otieno@mail.com", password: "ChangeMe123!" },
  { id: "eng-2", role: "ENGINEER", label: "Engineer: faith.mwangi", email: "faith.mwangi@mail.com", password: "ChangeMe123!" },
  { id: "viewer", role: "VIEWER", label: "Viewer", email: "viewer@mail.com", password: "ChangeMe123!" },
];

const DEMO_LOGIN_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";
const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

function OrbIcon({ role }: { role: DemoAccount["role"] }) {
  if (role === "ADMIN") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="login-orb-icon">
        <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" stroke="currentColor" strokeWidth="1.6" fill="currentColor" />
      </svg>
    );
  }
  if (role === "VIEWER") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="login-orb-icon">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="login-orb-icon">
      <circle cx="9" cy="9" r="3.2" fill="currentColor" />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 8.5 17.4 10 20 7.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [activeOrbId, setActiveOrbId] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [linePaths, setLinePaths] = useState<{ d: string; key: string }[]>([]);
  const [drawKey, setDrawKey] = useState(0);

  const sceneRef = useRef<HTMLDivElement>(null);
  const emailFieldRef = useRef<HTMLDivElement>(null);
  const passwordFieldRef = useRef<HTMLDivElement>(null);
  const orbRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const fillTimers = useRef<number[]>([]);

  function clearFillTimers() {
    fillTimers.current.forEach((t) => window.clearTimeout(t));
    fillTimers.current = [];
  }

  useEffect(() => clearFillTimers, []);

  function glitchType(target: "email" | "password", finalValue: string) {
    const setter = target === "email" ? setEmail : setPassword;
    const steps = finalValue.length;
    for (let i = 0; i < steps; i++) {
      const t = window.setTimeout(() => {
        const revealed = finalValue.slice(0, i);
        const cyclingChar = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        setter(revealed + cyclingChar);
        if (i === steps - 1) {
          window.setTimeout(() => setter(finalValue), 15);
        }
      }, i * 15);
      fillTimers.current.push(t);
    }
  }

  function runHandshake(account: DemoAccount) {
    clearFillTimers();
    setError(null);
    setActiveOrbId(account.id);

    const orbEl = orbRefs.current[account.id];
    const sceneEl = sceneRef.current;
    if (orbEl && sceneEl && emailFieldRef.current && passwordFieldRef.current) {
      const sceneBox = sceneEl.getBoundingClientRect();
      const orbBox = orbEl.getBoundingClientRect();
      const origin = {
        x: orbBox.left + orbBox.width / 2 - sceneBox.left,
        y: orbBox.top + orbBox.height / 2 - sceneBox.top,
      };

      const targets = [emailFieldRef.current, passwordFieldRef.current].map((el) => {
        const box = el.getBoundingClientRect();
        return {
          x: box.right - sceneBox.left,
          y: box.top + box.height / 2 - sceneBox.top,
        };
      });

      const paths = targets.map((t, i) => {
        const midX = (origin.x + t.x) / 2;
        return { d: `M ${origin.x} ${origin.y} C ${midX} ${origin.y}, ${midX} ${t.y}, ${t.x} ${t.y}`, key: `${account.id}-${i}` };
      });
      setLinePaths(paths);
      setDrawKey((k) => k + 1);
    }

    setFilling(true);
    glitchType("email", account.email);
    glitchType("password", account.password);
    const doneTimer = window.setTimeout(() => setFilling(false), Math.max(account.email.length, account.password.length) * 15 + 60);
    fillTimers.current.push(doneTimer);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign in failed");
        setLoading(false);
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div ref={sceneRef} className="relative flex items-center gap-10">
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        {linePaths.map((p) => (
          <path key={`${p.key}-${drawKey}`} d={p.d} className="login-handshake-line is-drawing" />
        ))}
      </svg>

      <form onSubmit={handleSubmit} className="space-y-5 w-full" noValidate>
        <div>
          <label htmlFor="email" className="login-mono block text-xs uppercase tracking-[0.15em] text-ink-muted mb-1.5">
            Identity
          </label>
          <div ref={emailFieldRef} className={`login-field-shell ${filling ? "is-filling" : ""}`}>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-mono w-full border border-base-border bg-base-bg px-3.5 py-2.5 text-ink placeholder:text-ink-faint focus:border-accent-cyan focus:outline-none"
              placeholder="your@mail.com"
            />
          </div>
        </div>
        <div>
          <label htmlFor="password" className="login-mono block text-xs uppercase tracking-[0.15em] text-ink-muted mb-1.5">
            Token
          </label>
          <div ref={passwordFieldRef} className={`login-field-shell ${filling ? "is-filling" : ""}`}>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-mono w-full border border-base-border bg-base-bg px-3.5 py-2.5 text-ink placeholder:text-ink-faint focus:border-accent-cyan focus:outline-none"
              placeholder="••••••••••"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="login-error login-mono text-sm text-status-down border border-status-down/30 bg-status-down/10 px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="login-submit login-mono w-full bg-accent-cyan text-[#041016] font-semibold uppercase tracking-wide py-2.5 hover:brightness-110 disabled:opacity-60"
        >
          {loading && <span className="spinner" aria-hidden />}
          {loading ? "Initializing..." : "Initialize Session →"}
        </button>
      </form>

      {DEMO_LOGIN_ENABLED && (
        <div className="login-keyring" role="group" aria-label="Demo role credentials">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.id}
              ref={(el) => {
                orbRefs.current[account.id] = el;
              }}
              type="button"
              onClick={() => runHandshake(account)}
              className={`login-orb ${activeOrbId === account.id ? "is-active" : ""}`}
              aria-label={`Fill credentials for ${account.label}`}
            >
              <OrbIcon role={account.role} />
              <span className="login-orb-tooltip">{account.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
