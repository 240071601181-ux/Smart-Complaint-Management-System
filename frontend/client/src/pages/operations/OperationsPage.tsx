import { useLocation } from "wouter";
import {
  Clock3,
  Filter,
  Headphones,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Target,
} from "lucide-react";
import { Button, Card, TierBadge } from "@/components/app/ui";
import { leads, pageMeta } from "@/mock/pipeline";
import type { IconType, Lead } from "@/mock/pipeline";
import { callIds, qualIds } from "@/mock/details";

export function OperationsPage({ type, onToast }: { type: string; onToast: (message: string) => void }) {
  const [, navigate] = useLocation();
  const configs: Record<string, { label: string; title: string; icon: IconType; rows: [string, string, string, string][] }> = {
    "/calls": { label: "CALL QUEUE", title: "Recent conversations", icon: Headphones, rows: [["Arjun Rao", "Outbound · English", "1m 32s", "Qualified HOT"], ["Meera Shah", "Outbound · Hindi", "2m 04s", "Qualified HOT"], ["Vikram Kulkarni", "Inbound · English", "48s", "Follow-up"], ["Nisha Khatri", "Outbound · Hindi", "1m 18s", "In review"], ["Rohan Sethi", "Outbound · English", "—", "No answer"]]},
    "/qualifications": { label: "SIGNAL REVIEW", title: "Latest qualification results", icon: Target, rows: [["Arjun Rao", "92", "HOT", "Chennai → Mumbai"], ["Meera Shah", "87", "HOT", "Surat → Delhi"], ["Priya Srinivas", "84", "HOT", "Bengaluru → Kochi"], ["Vikram Kulkarni", "71", "WARM", "Pune → Hyderabad"], ["Nisha Khatri", "66", "WARM", "Kolkata → Lucknow"]]},
    "/followups": { label: "ACTION QUEUE", title: "Upcoming actions", icon: Clock3, rows: [["Arjun Rao", "Send WhatsApp summary", "Today · 16:00", "Pending"], ["Vikram Kulkarni", "Retry AI call", "Tomorrow · 09:30", "Scheduled"], ["Nisha Khatri", "Share reefer quote", "Tomorrow · 11:00", "Scheduled"], ["Rohan Sethi", "Qualification check-in", "12 Sep · 15:30", "Pending"], ["Shah Textiles", "Booking confirmation", "13 Sep · 10:00", "Completed"]]},
  };
  const config = configs[type] ?? configs["/calls"];
  return <><div className="page-heading"><div><p className="lede">{pageMeta[type]?.description}</p></div><div className="heading-actions"><Button icon={RefreshCw} variant="secondary" onClick={() => onToast("Queue refreshed")}>Refresh</Button><Button icon={Plus} variant="primary" onClick={() => onToast(type === "/followups" ? "Follow-up scheduler opened" : "Operation flow opened")}>{type === "/followups" ? "Schedule follow-up" : "Start AI call"}</Button></div></div><div className="ops-stat-grid"><Card><span className="section-kicker">ACTIVE NOW</span><strong>{type === "/calls" ? "8" : type === "/followups" ? "12" : "186"}</strong><small>{type === "/calls" ? "voice sessions" : type === "/followups" ? "scheduled actions" : "qualified leads"}</small></Card><Card><span className="section-kicker">COMPLETION RATE</span><strong>{type === "/calls" ? "93.2%" : type === "/followups" ? "88.6%" : "72.4%"}</strong><small>last 7 days</small></Card><Card><span className="section-kicker">AVG. LATENCY</span><strong>{type === "/calls" ? "182ms" : "2.4 min"}</strong><small>system response</small></Card><Card><span className="section-kicker">NEEDS ATTENTION</span><strong className="amber-text">{type === "/calls" ? "3" : "5"}</strong><small>requires review</small></Card></div><Card className="table-card"><div className="card-header table-header"><div><span className="section-kicker">{config.label}</span><h2>{config.title}</h2></div><div className="filter-row"><button className="filter-select"><Filter size={14} /> Filter</button><button className="more-btn"><MoreHorizontal size={17} /></button></div></div><div className="table-wrap"><table><thead><tr><th>Lead</th><th>{type === "/calls" ? "Channel" : type === "/qualifications" ? "Score" : "Action"}</th><th>{type === "/calls" ? "Duration" : type === "/qualifications" ? "Tier" : "Scheduled time"}</th><th>{type === "/qualifications" ? "Route" : "Outcome"}</th><th>Status</th><th /></tr></thead><tbody>{config.rows.map((row, i) => <tr key={row[0]} onClick={() => { if (type === "/calls") navigate(`/calls/${callIds[i % callIds.length]}`); else if (type === "/qualifications") navigate(`/qualifications/${qualIds[i % qualIds.length]}`); }}><td><div className="person-cell"><span className="person-avatar small" style={{ background: `${leads[i % leads.length].color}18`, color: leads[i % leads.length].color }}>{leads[i % leads.length].initials}</span><span><b>{row[0]}</b><small>{leads[i % leads.length].company}</small></span></div></td><td>{row[1]}</td><td>{row[2]}</td><td>{type === "/qualifications" ? <TierBadge tier={row[2] as Lead["tier"]} /> : <span className="status-pill"><i />{row[3]}</span>}</td><td><span className={`status-label ${row[3].toLowerCase().includes("qualified") || row[3] === "Completed" ? "success" : row[3] === "No answer" ? "muted-status" : ""}`}>{row[3]}</span></td><td><button className="row-more" onClick={e => { e.stopPropagation(); onToast("Row actions opened") }}><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table></div></Card></>;
}
