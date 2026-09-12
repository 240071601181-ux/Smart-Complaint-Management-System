import { useState } from "react";
import { Check, Clock3, Filter, MoreHorizontal, Plus, RefreshCw, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, Card } from "@/components/app/ui";
import { useToast } from "@/layouts/AppLayout";

type FollowupRow = { lead: string; action: string; when: string; status: string };

const initialRows: FollowupRow[] = [
  { lead: "Arjun Rao", action: "Send WhatsApp summary", when: "Today · 16:00", status: "Pending" },
  { lead: "Vikram Kulkarni", action: "Retry AI call", when: "Tomorrow · 09:30", status: "Scheduled" },
  { lead: "Nisha Khatri", action: "Share reefer quote", when: "Tomorrow · 11:00", status: "Scheduled" },
  { lead: "Rohan Sethi", action: "Qualification check-in", when: "12 Sep · 15:30", status: "Pending" },
  { lead: "Shah Textiles", action: "Booking confirmation", when: "13 Sep · 10:00", status: "Completed" },
];

const dialogStyle: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(440px, calc(100vw - 32px))",
  zIndex: 50,
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.6)",
  zIndex: 40,
};

/**
 * Phase 14C-7: this queue stays on mock/demo rows. The backend exposes no
 * list-all endpoint, and mock rows carry no backend ids with incompatible
 * schedule fields, so Schedule/Retry/Cancel here remain local demo behavior
 * (toasts + local state). Genuine backend follow-up ids resolve through the
 * real endpoints on /followups/:id (GET + execute/cancel/retry) — see
 * FollowupDetailPage and `api/hooks/useFollowups.ts`. This list will switch
 * once a backend list endpoint lands.
 */
export default function FollowupsPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState(initialRows);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ index: number; mode: "cancel" | "retry" } | null>(null);
  const [action, setAction] = useState("Send WhatsApp summary");
  const [when, setWhen] = useState("Tomorrow · 09:30");

  const schedule = () => {
    setRows((r) => [{ lead: "Arjun Rao", action, when, status: "Scheduled" }, ...r]);
    setScheduleOpen(false);
    notify("Follow-up scheduled");
  };

  const applyConfirm = () => {
    if (!confirm) return;
    setRows((r) =>
      r.map((row, i) =>
        i === confirm.index
          ? { ...row, status: confirm.mode === "cancel" ? "Cancelled" : "Scheduled" }
          : row
      )
    );
    notify(confirm.mode === "cancel" ? "Follow-up cancelled" : "Follow-up re-queued for retry");
    setConfirm(null);
  };

  return (
    <>
      <div className="page-heading">
        <div><p className="lede">Keep the next best action in motion.</p></div>
        <div className="heading-actions">
          <Button icon={RefreshCw} variant="secondary" onClick={() => notify("Queue refreshed")}>Refresh</Button>
          <Dialog.Root open={scheduleOpen} onOpenChange={setScheduleOpen}>
            <Dialog.Trigger asChild>
              <button className="btn btn-primary"><Plus size={15} />Schedule follow-up</button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay style={overlayStyle} />
              <Dialog.Content style={dialogStyle} aria-label="Schedule follow-up">
                <Card className="tab-panel">
                  <div className="card-header">
                    <div><span className="section-kicker">FOLLOW-UPS</span><h2>Schedule follow-up</h2></div>
                    <button className="more-btn" onClick={() => setScheduleOpen(false)}><X size={16} /></button>
                  </div>
                  <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <label>Action
                      <select value={action} onChange={(e) => setAction(e.target.value)}>
                        <option>Send WhatsApp summary</option>
                        <option>Retry AI call</option>
                        <option>Share reefer quote</option>
                        <option>Booking confirmation</option>
                      </select>
                    </label>
                    <label>Scheduled time<input value={when} onChange={(e) => setWhen(e.target.value)} /></label>
                  </div>
                  <div className="heading-actions" style={{ marginTop: 18 }}>
                    <Button variant="ghost" onClick={() => setScheduleOpen(false)}>Cancel</Button>
                    <Button icon={Check} variant="primary" onClick={schedule}>Schedule</Button>
                  </div>
                </Card>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
      <div className="ops-stat-grid">
        <Card><span className="section-kicker">ACTIVE NOW</span><strong>12</strong><small>scheduled actions</small></Card>
        <Card><span className="section-kicker">COMPLETION RATE</span><strong>88.6%</strong><small>last 7 days</small></Card>
        <Card><span className="section-kicker">AVG. RESPONSE</span><strong>2.4 min</strong><small>system response</small></Card>
        <Card><span className="section-kicker">NEEDS ATTENTION</span><strong className="amber-text">5</strong><small>requires review</small></Card>
      </div>
      <Card className="table-card">
        <div className="card-header table-header">
          <div><span className="section-kicker">ACTION QUEUE</span><h2>Upcoming actions</h2></div>
          <div className="filter-row">
            <button className="filter-select" onClick={() => notify("Queue filters opened")}><Filter size={14} /> Filter</button>
            <button className="more-btn"><MoreHorizontal size={17} /></button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Lead</th><th>Action</th><th>Scheduled time</th><th>Outcome</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.lead}-${i}`}>
                  <td><b className="table-main">{row.lead}</b></td>
                  <td>{row.action}</td>
                  <td>{row.when}</td>
                  <td><span className="status-pill"><i />{row.status}</span></td>
                  <td><span className="status-label">{row.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="filter-select" onClick={() => setConfirm({ index: i, mode: "retry" })}><RefreshCw size={13} /> Retry</button>
                      <button className="filter-select" onClick={() => setConfirm({ index: i, mode: "cancel" })}><Clock3 size={13} /> Cancel</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Dialog.Root open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay style={overlayStyle} />
          <Dialog.Content style={dialogStyle} aria-label={confirm?.mode === "cancel" ? "Cancel follow-up" : "Retry follow-up"}>
            <Card className="tab-panel">
              <div className="card-header">
                <div>
                  <span className="section-kicker">FOLLOW-UPS</span>
                  <h2>{confirm?.mode === "cancel" ? "Cancel follow-up" : "Retry follow-up"}</h2>
                </div>
              </div>
              <p className="lede">
                {confirm?.mode === "cancel"
                  ? `Cancel “${confirm ? rows[confirm.index].action : ""}” for ${confirm ? rows[confirm.index].lead : ""}?`
                  : `Re-queue “${confirm ? rows[confirm.index].action : ""}” for ${confirm ? rows[confirm.index].lead : ""}?`}
              </p>
              <div className="heading-actions" style={{ marginTop: 18 }}>
                <Button variant="ghost" onClick={() => setConfirm(null)}>Keep</Button>
                <Button variant={confirm?.mode === "cancel" ? "danger" : "primary"} onClick={applyConfirm}>
                  {confirm?.mode === "cancel" ? "Cancel follow-up" : "Retry now"}
                </Button>
              </div>
            </Card>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
