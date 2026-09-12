import { useState } from "react";
import {
  Bell,
  Bot,
  Check,
  Network,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle2,
  Users,
} from "lucide-react";
import { Button, Card } from "@/components/app/ui";
import { pageMeta } from "@/mock/pipeline";
import { useToast } from "@/layouts/AppLayout";

function SettingsPage({ onToast }: { onToast: (message: string) => void }) {
  const [saved, setSaved] = useState(false);
  const [formKey, setFormKey] = useState(0);
  return <><div className="page-heading"><div><p className="lede">{pageMeta["/settings"].description}</p></div><div className="heading-actions"><Button variant="ghost" onClick={() => { setFormKey((k) => k + 1); setSaved(false); onToast("Settings reset to defaults"); }}>Reset</Button><Button icon={Check} variant="primary" onClick={() => { setSaved(true); onToast("Settings saved successfully") }}>{saved ? "Saved" : "Save changes"}</Button></div></div><div className="settings-layout"><Card className="settings-nav"><button className="active"><UserCircle2 size={16} />Profile</button><button><Users size={16} />Organization</button><button><Bot size={16} />AI agent</button><button><Bell size={16} />Notifications</button><button><Network size={16} />Integrations</button><button><ShieldCheck size={16} />Security</button><button><SlidersHorizontal size={16} />Appearance</button></Card><Card key={formKey} className="settings-form"><div className="settings-section"><span className="section-kicker">PROFILE</span><h2>Workspace defaults</h2><p>These settings apply to your operations workspace and default agent behavior.</p><div className="form-grid"><label>Workspace name<input defaultValue="Acme Cargo" /></label><label>Timezone<select defaultValue="Asia/Kolkata"><option value="Asia/Kolkata">Asia / Kolkata (IST)</option><option>UTC</option></select></label><label>Default language<select defaultValue="English"><option>English</option><option>Hindi</option><option>Tamil</option></select></label><label>Lead score threshold<input defaultValue="70" /></label></div></div><div className="settings-section divided"><span className="section-kicker">NOTIFICATIONS</span><h2>Operational alerts</h2><p>Choose which signals should interrupt your day.</p>{["Hot lead qualified", "Integration failure", "Follow-up due", "Daily operations digest"].map((label, i) => <div className="toggle-row" key={label}><span><b>{label}</b><small>{["Notify me when a lead crosses the HOT threshold", "Alert me when a connected service needs attention", "Keep the next best action visible", "Receive a summary at 6:00 PM local time"][i]}</small></span><button className={`toggle ${i === 3 ? "off" : "on"}`}><i /></button></div>)}</div></Card></div></>;
}
export default function SettingsPageRoute() {
  const { notify } = useToast();
  return <SettingsPage onToast={notify} />;
}
