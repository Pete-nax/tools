import net from "node:net";
import dns from "node:dns/promises";
import type { CheckType } from "@prisma/client";

export type CheckResult = {
  success: boolean;
  latencyMs: number | null;
  statusCode: number | null;
  errorMessage: string | null;
};

const CHECK_TIMEOUT_MS = 5000;

// Basic SSRF hardening: this tool runs server-side on Vercel and issues
// outbound requests to whatever host/port a device record points at.
// Block cloud metadata endpoints and loopback so a malicious or mistaken
// device entry cannot be used to pivot into the hosting platform itself.
const BLOCKED_HOSTS = new Set([
  "169.254.169.254", // AWS/GCP/Azure/Vercel metadata service
  "169.254.170.2", // ECS task metadata
  "localhost",
  "127.0.0.1",
  "::1",
]);

function assertHostAllowed(host: string) {
  if (BLOCKED_HOSTS.has(host.toLowerCase())) {
    throw new Error(`Host '${host}' is blocked for security reasons`);
  }
}

async function checkTcp(host: string, port: number): Promise<CheckResult> {
  assertHostAllowed(host);
  const start = performance.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result: CheckResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(CHECK_TIMEOUT_MS);

    socket.once("connect", () => {
      finish({
        success: true,
        latencyMs: Math.round(performance.now() - start),
        statusCode: null,
        errorMessage: null,
      });
    });

    socket.once("timeout", () => {
      finish({
        success: false,
        latencyMs: null,
        statusCode: null,
        errorMessage: `Connection to ${host}:${port} timed out after ${CHECK_TIMEOUT_MS}ms`,
      });
    });

    socket.once("error", (err) => {
      finish({
        success: false,
        latencyMs: null,
        statusCode: null,
        errorMessage: err.message,
      });
    });

    socket.connect(port, host);
  });
}

async function checkHttp(host: string, port: number | null, secure: boolean): Promise<CheckResult> {
  assertHostAllowed(host);
  const scheme = secure ? "https" : "http";
  const portSegment = port ? `:${port}` : "";
  const url = `${scheme}://${host}${portSegment}/`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  const start = performance.now();

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    const latencyMs = Math.round(performance.now() - start);
    return {
      success: res.status < 500,
      latencyMs,
      statusCode: res.status,
      errorMessage: res.status >= 500 ? `Server responded with ${res.status}` : null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown network error";
    return {
      success: false,
      latencyMs: null,
      statusCode: null,
      errorMessage: message.includes("abort") ? `Request timed out after ${CHECK_TIMEOUT_MS}ms` : message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkDns(host: string): Promise<CheckResult> {
  assertHostAllowed(host);
  const start = performance.now();
  try {
    await dns.lookup(host);
    return {
      success: true,
      latencyMs: Math.round(performance.now() - start),
      statusCode: null,
      errorMessage: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "DNS resolution failed";
    return { success: false, latencyMs: null, statusCode: null, errorMessage: message };
  }
}

/**
 * Runs a real network reachability check against a device. No mocked or
 * simulated results: TCP checks open an actual socket, HTTP(S) checks
 * issue an actual request, DNS checks perform an actual lookup.
 *
 * Note: this runs from Vercel's serverless network, so it can only reach
 * devices with a routable/public address (or one exposed via VPN/tunnel
 * into that function). It cannot ARP-scan a private LAN it isn't attached
 * to; that requires an on-prem agent, which is outside the scope of a
 * serverless deployment.
 */
export async function runCheck(
  checkType: CheckType,
  host: string,
  port: number | null
): Promise<CheckResult> {
  switch (checkType) {
    case "TCP":
      if (!port) {
        return { success: false, latencyMs: null, statusCode: null, errorMessage: "TCP check requires a port" };
      }
      return checkTcp(host, port);
    case "HTTP":
      return checkHttp(host, port, false);
    case "HTTPS":
      return checkHttp(host, port, true);
    case "DNS":
      return checkDns(host);
    default:
      return { success: false, latencyMs: null, statusCode: null, errorMessage: "Unsupported check type" };
  }
}
