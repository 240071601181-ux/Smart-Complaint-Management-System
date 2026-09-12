import { IntegrationPage } from "./IntegrationPage";
import { useToast } from "@/layouts/AppLayout";

/**
 * Phase 14C-11: WhatsApp stays fully mock/demo. Backend route audit confirms
 * NO user-facing WhatsApp endpoint exists — sending is internal async-only
 * (src/services/whatsapp/*, template sends gated by consent server-side).
 * Nothing is sent from the browser, no consent/opt-in behavior was faked,
 * and no provider credentials exist in frontend code.
 */
export default function WhatsappPage() {
  const { notify } = useToast();
  return <IntegrationPage type="/whatsapp" onToast={notify} />;
}
