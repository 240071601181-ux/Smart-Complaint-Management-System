import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { ChevronLeft, Clock3, Play, RefreshCw } from "lucide-react";
import { Button, Card } from "@/components/app/ui";
import { NotFoundState } from "@/components/app/NotFoundState";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/layouts/AppLayout";
import {
  followupKeys,
  useCancelFollowupMutation,
  useExecuteFollowupMutation,
  useFollowupQuery,
  useRetryFollowupMutation,
} from "@/api/hooks/useFollowups";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, getUserMessage } from "@/api/errors";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  return new Date(iso).toLocaleString();
}

/**
 * Phase 14C-7 — Follow-up detail for genuine backend ids:
 *   GET  /api/v1/followups/:id
 *   POST /api/v1/followups/:id/execute | /cancel | /retry
 *
 * No detail route existed before and mock rows carry no backend ids, so this
 * page is only meaningful for backend records; unknown ids show the standard
 * not-found state. execute-due stays internal and has no UI here.
 */
export default function FollowupDetailPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const id = params.id ?? "";
  const query = useFollowupQuery(id);
  const executeMutation = useExecuteFollowupMutation();
  const cancelMutation = useCancelFollowupMutation();
  const retryMutation = useRetryFollowupMutation();
  const [actionError, setActionError] = useState<string | null>(null);

  const anyPending =
    executeMutation.isPending || cancelMutation.isPending || retryMutation.isPending;

  const runAction = (
    label: string,
    mutation: {
      mutate: (
        followupId: string,
        options: { onSuccess: () => void; onError: (error: unknown) => void }
      ) => void;
    }
  ) => {
    if (anyPending) return; // prevent duplicate submissions
    setActionError(null);
    mutation.mutate(id, {
      onSuccess: () => {
        notify(label);
        // Refresh the authoritative record (invalidation also fires in hooks).
        void queryClient.invalidateQueries({ queryKey: followupKeys.detail(id) });
      },
      onError: (error: unknown) =>
        setActionError(error instanceof Error ? getUserMessage(error) : "Something went wrong."),
    });
  };

  if (query.isPending) {
    return (
      <>
        <button className="back-link" onClick={() => navigate("/followups")}><ChevronLeft size={15} />Back to follow-ups</button>
        <Card className="lead-hero">
          <div className="lead-hero-main" style={{ width: "100%" }}>
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

  if (query.isError) {
    const error = query.error instanceof Error ? query.error : new Error("Something went wrong.");
    if (error instanceof ApiError && error.kind === "not-found") {
      return <NotFoundState label="Follow-up" backPath="/followups" />;
    }
    return (
      <>
        <button className="back-link" onClick={() => navigate("/followups")}><ChevronLeft size={15} />Back to follow-ups</button>
        <Card className="tab-panel">
          <div className="empty-state">
            <span className="section-kicker">ERROR</span>
            <b>Couldn&apos;t load this follow-up</b>
            <span>{getUserMessage(error)}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="primary" onClick={() => void query.refetch()}>Retry</Button>
            </div>
          </div>
        </Card>
      </>
    );
  }

  const followup = query.data;

  return (
    <>
      <button className="back-link" onClick={() => navigate("/followups")}><ChevronLeft size={15} />Back to follow-ups</button>
      <Card className="tab-panel" style={{ marginBottom: 12, padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="section-kicker" style={{ margin: 0 }}>LIVE BACKEND RECORD</span>
          <span style={{ fontSize: 10, color: "#8190a1" }}>
            ID {followup.id} · {followup.action} · key {followup.followup_key}
          </span>
        </div>
      </Card>
      <Card className="lead-hero">
        <div className="lead-hero-main">
          <div>
            <div className="hero-name-row"><h2>{followup.action}</h2></div>
            <p>
              <span className="status-pill"><i />{followup.status}</span>
              <span> • </span> due {formatDateTime(followup.scheduled_at)}
              <span> • </span> {followup.attempts} attempt{followup.attempts === 1 ? "" : "s"}
            </p>
            <div className="hero-route">
              <span>{followup.lead_id ? `Lead ${followup.lead_id}` : followup.call_id ? `Call ${followup.call_id}` : "No linked lead/call"}</span>
              <span className="route-code">{followup.id}</span>
            </div>
          </div>
        </div>
        <div className="hero-actions">
          <Button
            icon={Play}
            variant="primary"
            onClick={() => runAction("Follow-up executed", executeMutation)}
            disabled={anyPending}
          >
            {executeMutation.isPending ? "Executing…" : "Execute now"}
          </Button>
          <Button
            icon={RefreshCw}
            variant="secondary"
            onClick={() => runAction("Follow-up re-queued for retry", retryMutation)}
            disabled={anyPending}
          >
            {retryMutation.isPending ? "Retrying…" : "Retry"}
          </Button>
          <Button
            icon={Clock3}
            variant="danger"
            onClick={() => runAction("Follow-up cancelled", cancelMutation)}
            disabled={anyPending}
          >
            {cancelMutation.isPending ? "Cancelling…" : "Cancel"}
          </Button>
        </div>
      </Card>
      {actionError && (
        <Card className="tab-panel" style={{ marginTop: 12, padding: "10px 16px" }}>
          <span style={{ fontSize: 11, color: "#f87171" }}>{actionError}</span>
        </Card>
      )}
      <div className="detail-grid">
        <Card className="tab-panel">
          <div className="card-header">
            <div><span className="section-kicker">FOLLOW-UP RECORD</span><h2>Execution detail</h2></div>
          </div>
          <div className="detail-fields">
            <div><span>Status</span><b>{followup.status}</b></div>
            <div><span>Scheduled for</span><b>{formatDateTime(followup.scheduled_at)}</b></div>
            <div><span>Attempts</span><b>{followup.attempts}</b></div>
            <div><span>Last error</span><b>{followup.last_error ?? "—"}</b></div>
            <div><span>Lead</span><b>{followup.lead_id ?? "—"}</b></div>
            <div><span>Call</span><b>{followup.call_id ?? "—"}</b></div>
          </div>
          {followup.lead_id && (
            <div className="heading-actions" style={{ marginTop: 14 }}>
              <Button variant="secondary" onClick={() => navigate(`/leads/${followup.lead_id}`)}>
                Open lead record
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
