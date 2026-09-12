import { useLocation } from "wouter";
import { ArrowUpRight, CircleHelp } from "lucide-react";
import { Button, Card } from "@/components/app/ui";

/**
 * Phase 14C-2 – themed 404 in the app visual language.
 * Unknown routes show Page Not Found with Back to Dashboard.
 */
export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="app-shell">
      <main className="main-shell" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <Card className="tab-panel" style={{ maxWidth: 460, textAlign: "center" }}>
          <div className="empty-state">
            <span className="metric-icon metric-cyan"><CircleHelp size={16} /></span>
            <span className="section-kicker">404</span>
            <b>Page Not Found</b>
            <span>The page you are looking for doesn’t exist or was moved.</span>
            <Button variant="primary" icon={ArrowUpRight} onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
