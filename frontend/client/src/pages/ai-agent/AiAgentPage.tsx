import { useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  Database,
  MessageCircle,
  Mic2,
  MoreHorizontal,
  Pause,
  Phone,
  Play,
  ShieldCheck,
} from "lucide-react";
import { AmbientShards, Button, Card, IconView } from "@/components/app/ui";
import { pageMeta } from "@/mock/pipeline";
import type { IconType } from "@/mock/pipeline";
import { useToast } from "@/layouts/AppLayout";

/**
 * Phase 14C-10: all configuration on this page is demo/local state. The
 * backend exposes NO config CRUD endpoint (no GET/PATCH /api/v1/agent/config
 * or similar — verified), so pause/resume, language/prompt/rules/tool values
 * and the performance/tool statuses are local display state only. Nothing
 * here claims to persist server-side. The live orchestrator is reachable only
 * through POST /api/v1/vapi/custom-llm/chat/completions (see
 * `api/services/agent.ts`); no test/chat action exists in this UI, so nothing
 * calls it yet — RAG/agent behavior stays backend-side.
 */
function AIPage({ onToast }: { onToast: (message: string) => void }) {
  const [active, setActive] = useState(true);
  return <><AmbientShards variant="agent" /><div className="page-heading"><div><p className="lede">{pageMeta["/ai-agent"].description}</p></div><div className="heading-actions"><span className="agent-live"><i />{active ? "Agent live" : "Agent paused"}</span><Button icon={active ? Pause : Play} variant={active ? "secondary" : "primary"} onClick={() => { setActive(!active); onToast(active ? "Voice agent paused" : "Voice agent is live") }}>{active ? "Pause agent" : "Resume agent"}</Button></div></div><div className="ai-grid"><Card className="agent-visual"><div className="card-header"><div><span className="section-kicker">VOICE AGENT</span><h2>MadVoice Qualifier v2.4</h2></div><span className="connected-chip"><ShieldCheck size={13} />Connected</span></div><div className={`voice-orb ${active ? "listening" : "paused"}`}><div className="orb-ring ring-1" /><div className="orb-ring ring-2" /><div className="orb-core"><Mic2 size={30} /><span>{active ? "Listening" : "Paused"}</span></div></div><div className="waveform">{Array.from({ length: 36 }).map((_, i) => <i key={i} style={{ height: `${12 + ((i * 17) % 42)}px`, animationDelay: `${i * 20}ms` }} />)}</div><div className="agent-stats"><span><small>LANGUAGE</small><b>English · Hindi · Tamil</b></span><span><small>VOICE</small><b>Nova / Warm</b></span><span><small>AVG. LATENCY</small><b className="accent-text">182ms</b></span></div></Card><Card className="config-card"><div className="card-header"><div><span className="section-kicker">CONFIGURATION</span><h2>Conversation behavior</h2></div><button className="more-btn"><MoreHorizontal size={17} /></button></div><div className="config-list">{[["Greeting", "Warm, concise, and context-aware"], ["Qualification questions", "Route → vehicle → cargo → budget"], ["Escalation behavior", "Offer human handoff after 2 retries"], ["Call ending", "Summarize, confirm next action, close"]].map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b><ChevronRight size={15} /></div>)}</div><Button variant="secondary" className="full-btn" onClick={() => onToast("Agent configuration editor opened")}>Edit configuration</Button></Card><Card className="performance-card"><div className="card-header"><div><span className="section-kicker">PERFORMANCE</span><h2>Agent health</h2></div><span className="health-badge">Healthy</span></div><div className="performance-grid"><div><strong>93.2%</strong><span>Call connection</span></div><div><strong>72.4%</strong><span>Qualification rate</span></div><div><strong>4.8/5</strong><span>Conversation quality</span></div><div><strong>18.6s</strong><span>Avg. first response</span></div></div><div className="spark-bars">{[32, 42, 38, 60, 52, 71, 67, 82, 73, 89, 86, 100].map((v, i) => <i key={i} style={{ height: `${v}%` }} />)}</div></Card><Card className="tools-card"><div className="card-header"><div><span className="section-kicker">TOOL ACCESS</span><h2>Connected capabilities</h2></div></div><div className="tool-list">{[[Phone, "Voice gateway", "Operational"], [Database, "CRM lookup", "Operational"], [MessageCircle, "WhatsApp send", "Operational"], [CalendarDays, "Calendar booking", "Needs review"]].map(([I, name, status]) => <div key={name as string}><span className="tool-icon"><IconView icon={I as IconType} size={15} /></span><b>{name as string}</b><span className={status === "Operational" ? "tool-status" : "tool-status warning"}>{status as string}</span></div>)}</div></Card></div></>;
}
export default function AiAgentPage() {
  const { notify } = useToast();
  return <AIPage onToast={notify} />;
}
