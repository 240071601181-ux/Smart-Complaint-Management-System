import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  ListFilter,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { Button, Card, TierBadge } from "@/components/app/ui";
import { leads, pageMeta } from "@/mock/pipeline";
import type { Lead } from "@/mock/pipeline";
import { useToast } from "@/layouts/AppLayout";

function LeadsPage({ onToast }: { onToast: (message: string) => void }) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("All signals");
  // Phase 14C-4: no backend GET-all-leads endpoint exists, so the list keeps
  // using the mock/demo dataset. Detail (/leads/:id), edit and create use the
  // real API; the list will switch once a backend list endpoint lands.
  const filtered = useMemo(() => leads.filter(l => `${l.name} ${l.company} ${l.route}`.toLowerCase().includes(query.toLowerCase()) && (tier === "All signals" || l.tier === tier)), [query, tier]);
  return <><div className="page-heading"><div><p className="lede">{pageMeta["/leads"].description}</p></div><div className="heading-actions"><Button icon={Filter} variant="secondary" onClick={() => onToast("Advanced filters are ready")}>Filters <span className="btn-count">3</span></Button><Button icon={Plus} variant="primary" onClick={() => navigate("/leads/new")}>Create lead</Button></div></div><Card className="table-card"><div className="toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search leads, companies, routes…" /></div><div className="filter-row"><select value={tier} onChange={e => setTier(e.target.value)}><option>All signals</option><option>HOT</option><option>WARM</option><option>COLD</option></select><button className="filter-select"><ListFilter size={14} /> More filters <span className="filter-count">3</span></button></div></div><div className="table-wrap leads-table"><table><thead><tr><th>Lead</th><th>Company</th><th>Route</th><th>Vehicle</th><th>Budget</th><th>Signal</th><th>Status</th><th>Last contact</th><th /></tr></thead><tbody>{filtered.map(lead => <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}><td><div className="person-cell"><span className="person-avatar" style={{ background: `${lead.color}18`, color: lead.color }}>{lead.initials}</span><span><b>{lead.name}</b><small>{lead.id} · {lead.phone}</small></span></div></td><td><b className="table-main">{lead.company}</b><small className="table-sub">{lead.cargo}</small></td><td><b className="table-main">{lead.route}</b><small className="table-sub">{lead.vehicle}</small></td><td>{lead.vehicle.split(" ").slice(0, 2).join(" ")}</td><td>{lead.budget}</td><td><div className="score-cell"><TierBadge tier={lead.tier} /><b>{lead.score}</b></div></td><td><span className="status-pill"><i />{lead.status}</span></td><td className="muted">{lead.last}</td><td><button className="row-more" onClick={e => { e.stopPropagation(); onToast("Lead actions opened") }}><MoreHorizontal size={16} /></button></td></tr>)}{!filtered.length && <tr><td colSpan={9}><div className="empty-state"><Search size={22} /><b>No leads match your current filters.</b><span>Try broadening your search or clearing a filter.</span></div></td></tr>}</tbody></table></div><div className="table-footer"><span>Showing <b>{filtered.length}</b> of 1,284 leads</span><div className="pagination"><button><ChevronLeft size={14} /></button><button className="current">1</button><button>2</button><button>3</button><span>…</span><button>64</button><button><ChevronRight size={14} /></button></div></div></Card></>;
}
export default function LeadsPageRoute() {
  const { notify } = useToast();
  return <LeadsPage onToast={notify} />;
}
