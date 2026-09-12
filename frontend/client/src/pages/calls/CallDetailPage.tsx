import { useLocation, useParams } from "wouter";
import { ArrowUpRight, Check, ChevronLeft, Mic2, MoreHorizontal, Play } from "lucide-react";
import { Button, Card, TierBadge } from "@/components/app/ui";
import { NotFoundState } from "@/components/app/NotFoundState";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/layouts/AppLayout";
import { findCall, findLead } from "@/mock/details";
import type { MockCall } from "@/mock/details";
import { useQualificationByCall } from "@/api/hooks/useQualifications";
import { useLeadDetail } from "@/api/hooks/useLeads";
import { ApiError, getUserMessage } from "@/api/errors";

/** Demo-only call detail assembled from mock call + lead fixtures. */
function MockCallView({ call }: { call: MockCall }) {
  const [, navigate] = useLocation();
  const { notify } = useToast();
  const lead = findLead(call.leadId);

  return (
    <>
      <button className="back-link" onClick={() => navigate("/calls")}><ChevronLeft size={15} />Back to calls</button>
      <Card className="lead-hero">
        <div className="lead-hero-main">
          <span className="hero-avatar"><Mic2 size={22} /></span>
          <div>
            <div className="hero-name-row">
              <h2>{call.id}</h2>
              {lead && <TierBadge tier={lead.tier} />}
            </div>
            <p>{call.direction} · {call.language} <span>•</span> {call.time} <span>•</span> {call.latency} latency</p>
            <div className="hero-route">
              <span>{lead ? `${lead.name} · ${lead.company}` : call.leadId}</span>
              <span className="route-code">{call.duration}</span>
            </div>
          </div>
        </div>
        <div className="hero-actions">
          <Button icon={Play} variant="primary" onClick={() => notify("Playback controls opened")}>Play recording</Button>
          <button className="icon-btn surface" onClick={() => notify("More call actions opened")}><MoreHorizontal size={16} /></button>
        </div>
      </Card>
      <div className="detail-tabs">
        {["Overview", "Transcript"].map((t) => (
          <button key={t} className={t === "Overview" ? "active" : ""}>{t}</button>
        ))}
      </div>
      <div className="detail-grid">
        <Card className="tab-panel">
          <div className="card-header">
            <div><span className="section-kicker">CALL RECORD</span><h2>Conversation summary</h2></div>
            <button className="more-btn"><MoreHorizontal size={17} /></button>
          </div>
          <div className="detail-fields">
            <div><span>Channel</span><b>{call.channel}</b></div>
            <div><span>Duration</span><b>{call.duration}</b></div>
            <div><span>Outcome</span><b>{call.outcome}</b></div>
            <div><span>Started</span><b>{call.time}</b></div>
          </div>
          <div className="requirements">
            <span>OUTCOME</span>
            <p>{call.outcome} — recorded against {lead ? `${lead.name} (${lead.company})` : call.leadId}.</p>
          </div>
        </Card>
        <Card className="tab-panel">
          <div className="card-header">
            <div><span className="section-kicker">NEXT STEP</span><h2>Follow-through</h2></div>
          </div>
          <div className="call-row">
            <span className="call-status done"><Check size={14} /></span>
            <div><b>Review qualification</b><small>Signal attached to this conversation</small></div>
            <button className="play-btn" onClick={() => lead && navigate(`/qualifications`)}><ArrowUpRight size={14} /></button>
          </div>
          <div className="call-row">
            <span className="call-status done"><Check size={14} /></span>
            <div><b>Open lead record</b><small>{lead ? `${lead.name} · ${lead.id}` : call.leadId}</small></div>
            <button className="play-btn" onClick={() => lead && navigate(`/leads/${lead.id}`)}><ArrowUpRight size={14} /></button>
          </div>
        </Card>
      </div>
    </>
  );
}

/**
 * Phase 14C-6 — live view for genuine backend call ids. The backend exposes
 * no call-detail endpoint, so this view is composed from real endpoints only:
 *   GET /api/v1/qualifications/calls/:callId (required — identifies the call)
 *   GET /api/v1/leads/:id (linked lead, when the qualification carries one)
 * No call logic is duplicated and no endpoint is invented.
 */
function LiveCallView({ callId }: { callId: string }) {
  const [, navigate] = useLocation();
  const qualQuery = useQualificationByCall(callId);
  const qual = qualQuery.data ?? null;
  const leadDetail = useLeadDetail(qual?.lead_id ?? undefined);

  if (qualQuery.isPending) {
    return (
      <>
        <button className="back-link" onClick={() => navigate("/calls")}><ChevronLeft size={15} />Back to calls</button>
        <Card className="lead-hero">
          <div className="lead-hero-main" style={{ width: "100%" }}>
            <Skeleton className="h-12 w-12 rounded-full" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-72" />
            </div>
          </div>
        </Card>
        <Card className="tab-panel">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-24 w-full" />
        </Card>
      </>
    );
  }

  if (qualQuery.isError) {
    const error = qualQuery.error instanceof Error ? qualQuery.error : new Error("Something went wrong.");
    if (error instanceof ApiError && error.kind === "not-found") {
      return <NotFoundState label="Call" backPath="/calls" />;
    }
    return (
      <>
        <button className="back-link" onClick={() => navigate("/calls")}><ChevronLeft size={15} />Back to calls</button>
        <Card className="tab-panel">
          <div className="empty-state">
            <span className="section-kicker">ERROR</span>
            <b>Couldn&apos;t load this call&apos;s signal</b>
            <span>{getUserMessage(error)}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="primary" onClick={() => void qualQuery.refetch()}>Retry</Button>
            </div>
          </div>
        </Card>
      </>
    );
  }

  if (!qual) return <NotFoundState label="Call" backPath="/calls" />;

  const leadName =
    leadDetail.status === "ready" ? leadDetail.displayLead.name : (qual.lead_id ?? "—");

  return (
    <>
      <button className="back-link" onClick={() => navigate("/calls")}><ChevronLeft size={15} />Back to calls</button>
      <Card className="tab-panel" style={{ marginBottom: 12, padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="section-kicker" style={{ margin: 0 }}>LIVE BACKEND RECORD</span>
          <span style={{ fontSize: 10, color: "#8190a1" }}>
            Call {qual.call_id} · qualification {qual.id} · score and tier are backend-computed. No call-detail endpoint exists, so this view is composed from the qualification record.
          </span>
        </div>
      </Card>
      <Card className="lead-hero">
        <div className="lead-hero-main">
          <span className="hero-avatar"><Mic2 size={22} /></span>
          <div>
            <div className="hero-name-row">
              <h2>{qual.call_id}</h2>
              <TierBadge tier={qual.tier} />
            </div>
            <p>AI voice call <span>•</span> score {qual.score}/100 <span>•</span> qualified {qual.qualified_at}</p>
            <div className="hero-route">
              <span>{leadName}</span>
              <span className="route-code">{qual.id}</span>
            </div>
          </div>
        </div>
        <div className="lead-score">
          <span>QUALIFICATION SCORE</span>
          <strong>{qual.score}<small>/100</small></strong>
          <div className="score-bar"><i style={{ width: `${qual.score}%` }} /></div>
        </div>
        <div className="hero-actions">
          <Button icon={ArrowUpRight} variant="primary" onClick={() => navigate(`/qualifications/${qual.call_id}`)}>Open signal breakdown</Button>
        </div>
      </Card>
      <div className="detail-grid">
        <Card className="tab-panel">
          <div className="card-header">
            <div><span className="section-kicker">NEXT STEP</span><h2>Follow-through</h2></div>
          </div>
          <div className="call-row">
            <span className="call-status done"><Check size={14} /></span>
            <div><b>Review qualification</b><small>{qual.tier} · {qual.score}/100 via backend</small></div>
            <button className="play-btn" onClick={() => navigate(`/qualifications/${qual.call_id}`)}><ArrowUpRight size={14} /></button>
          </div>
          {qual.lead_id && (
            <div className="call-row">
              <span className="call-status done"><Check size={14} /></span>
              <div><b>Open lead record</b><small>{leadName} · {qual.lead_id}</small></div>
              <button className="play-btn" onClick={() => navigate(`/leads/${qual.lead_id}`)}><ArrowUpRight size={14} /></button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

/**
 * Phase 14C-6 — Calls detail.
 * Demo ids (CALL-xxxx) keep the untouched mock view with zero backend calls.
 * Any other id is treated as a genuine backend callId and resolves through
 * the real qualification endpoint (404 -> NotFound, as before for unknowns).
 */
export default function CallDetailPage() {
  const params = useParams();
  const id = params.id ?? "";
  const call = findCall(id);
  if (call) return <MockCallView call={call} />;
  return <LiveCallView callId={id} />;
}
