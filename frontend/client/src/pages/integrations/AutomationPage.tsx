import { IntegrationPage } from "./IntegrationPage";
import { useToast } from "@/layouts/AppLayout";

/**
 * Phase 14C-11: n8n stays fully mock/demo. Backend route audit confirms NO
 * user-facing n8n endpoint exists — the emitter is internal async-only
 * (src/services/n8n/*). No /api/v1/n8n endpoints were invented, no webhook
 * is called from the browser, and no webhook secrets exist in frontend code.
 */
export default function AutomationPage() {
  const { notify } = useToast();
  return <IntegrationPage type="/automation" onToast={notify} />;
}
