import { useState } from "react";
import { AlertCircle, Bell, CheckCircle2, Clock3, Target } from "lucide-react";
import { Card } from "@/components/app/ui";
import { useToast } from "@/layouts/AppLayout";

const initial = [
  { icon: Target, color: "violet", title: "Hot lead qualified", sub: "Arjun Rao crossed the HOT threshold · score 92", time: "8m", read: false },
  { icon: AlertCircle, color: "amber", title: "Integration needs attention", sub: "Calendar sync delayed · retrying automatically", time: "42m", read: false },
  { icon: Clock3, color: "cyan", title: "Follow-up due", sub: "VK Industrial retry call scheduled for tomorrow", time: "1h", read: false },
  { icon: CheckCircle2, color: "green", title: "WhatsApp delivered", sub: "PS Pharma recap delivered successfully", time: "3h", read: true },
  { icon: Bell, color: "cyan", title: "Daily digest ready", sub: "Operations summary for your workspace", time: "6h", read: true },
];

/**
 * Phase 14C-12: notifications stay fully mock/demo with local read state.
 * Complete backend route audit confirms NO notification list/read endpoint
 * exists — no notification APIs were invented and read state is not claimed
 * to persist server-side. Sidebar/topbar badges and unread counts likewise
 * remain demo-local (never derived from unrelated APIs). This page will
 * switch once a backend endpoint lands.
 */
export default function NotificationsPage() {
  const { notify } = useToast();
  const [items, setItems] = useState(initial);
  const unread = items.filter((i) => !i.read).length;
  return (
    <>
      <div className="page-heading">
        <div><p className="lede">Operational alerts that need your attention.</p></div>
      </div>
      <Card className="activity-card">
        <div className="card-header">
          <div><span className="section-kicker">SIGNALS</span><h2>Notifications {unread > 0 && `(${unread} unread)`}</h2></div>
          <button
            className="link-btn"
            onClick={() => { setItems((rows) => rows.map((r) => ({ ...r, read: true }))); notify("All notifications marked as read"); }}
          >
            Mark all as read
          </button>
        </div>
        <div className="activity-list">
          {items.map((item) => (
            <div className="activity-item" key={item.title}>
              <span className={`activity-icon ${item.color}`}><item.icon size={14} /></span>
              <span className="activity-copy"><b>{item.title}</b><small>{item.sub}</small></span>
              <time>{item.read ? item.time : `● ${item.time}`}</time>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
