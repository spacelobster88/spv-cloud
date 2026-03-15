/**
 * Typed fetch wrapper for the FastAPI backend.
 *
 * - Server-side (SSR / RSC): uses the Docker-internal URL or localhost.
 * - Client-side (browser): uses a relative path so the Next.js rewrites
 *   proxy the request to the backend.
 *
 * Usage:
 *   const data = await api<Vehicle[]>("/api/vehicles");
 */

/** Resolve the correct base URL depending on execution context. */
function getBaseUrl(): string {
  // Server-side: prefer the env var (set in docker-compose or .env.local),
  // then fall back to localhost for local dev.
  if (typeof window === "undefined") {
    return process.env.FASTAPI_URL ?? "http://localhost:8000";
  }

  // Client-side: proxy through Next.js rewrites (see next.config.ts).
  // An empty string means "same origin", which lets the rewrite handle it.
  return process.env.NEXT_PUBLIC_FASTAPI_URL ?? "";
}

/** Standard error shape returned by the backend. */
export interface ApiError {
  detail: string;
  status: number;
}

/** Thin wrapper around fetch with generics and automatic JSON parsing. */
export async function api<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response body was not JSON — keep statusText
    }

    const error: ApiError = { detail, status: res.status };
    throw error;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Convenience helpers (extend as the API surface grows)
// ---------------------------------------------------------------------------

export async function fetchHealth(): Promise<{ status: string }> {
  return api<{ status: string }>("/health");
}
