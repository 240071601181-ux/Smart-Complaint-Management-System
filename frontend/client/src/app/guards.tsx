import { Redirect } from "wouter";
import { isDemoAuthenticated } from "./demoAuth";

/**
 * UI-only route protection (Phase 14C-AUTH-FIX).
 *
 * Previously a passthrough, so logged-out users never saw /login. Now
 * unauthenticated visits to app routes bounce to /login. The session is the
 * demo session in `./demoAuth` — no backend involved. When backend auth
 * lands, enforce the real session here without touching routes.tsx.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isDemoAuthenticated()) {
    return <Redirect to="/login" />;
  }
  return <>{children}</>;
}
