/**
 * Existing platform-session forwarding for the centralized HTTP client.
 *
 * The shell's authenticated session is the Manus platform session: an
 * HttpOnly cookie (`COOKIE_NAME`) plus, for browsers that block third-party
 * cookies (Safari ITP / private browsing / WebView), a runtime mirror in
 * `sessionStorage["manus-cookie"]` forwarded as a Bearer token. This is the
 * exact mechanism the tRPC link in `client/src/main.tsx` already uses — this
 * module reuses it so plain REST calls (Start call, leads, …) carry the same
 * credential instead of arriving unauthenticated (HTTP 401).
 *
 * No new auth system, no hardcoded tokens, no secrets: the value forwarded
 * is the existing runtime session, established at login and cleared at
 * logout (`useAuth` / `demoLogout` remove the mirror; the server clears the
 * cookie). Never log the returned header value.
 */

import { COOKIE_NAME } from "@shared/const";

const SESSION_MIRROR_KEY = "manus-cookie";

/** `Authorization: Bearer <session>` when the mirror exists, else `{}`. */
export function getSessionAuthHeader(): Record<string, string> {
  try {
    if (typeof sessionStorage === "undefined") return {};
    const raw = sessionStorage.getItem(SESSION_MIRROR_KEY);
    if (!raw) return {};
    const prefix = `${COOKIE_NAME}=`;
    const pair = raw.split(";").find((s) => s.trim().startsWith(prefix));
    const token = pair?.trim().slice(prefix.length);
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // sessionStorage unavailable (SSR / restricted contexts).
  }
  return {};
}
