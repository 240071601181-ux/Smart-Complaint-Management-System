import { IntegrationPage } from "./IntegrationPage";
import { useToast } from "@/layouts/AppLayout";

/**
 * Phase 14C-11: CRM stays fully mock/demo. Backend route audit (src/app.ts +
 * src/routes/*) confirms NO frontend-callable CRM endpoint exists — CRM sync
 * is internal async-only (src/services/crm/*, fire-and-forget tails in lead/
 * qualification flows). No GET/PATCH /api/v1/crm/* was invented. Status
 * indicators ("Operational", sync metrics) are demo-local, not
 * backend-verified. No CRM keys/secrets exist in frontend code.
 */
export default function CrmPage() {
  const { notify } = useToast();
  return <IntegrationPage type="/crm" onToast={notify} />;
}
