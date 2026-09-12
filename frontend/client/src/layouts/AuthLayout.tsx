/**
 * Phase 14C-AUTH — layout shell for authentication screens.
 *
 * Auth pages render full-screen (no sidebar/topbar). The Stitch auth designs
 * are self-contained in `.auth-screen`, so this layout only provides a stable
 * semantic wrapper. No session or redirect logic lives here — route
 * protection stays UI-only in `app/guards.tsx` until backend auth lands.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="auth-layout">{children}</div>;
}
