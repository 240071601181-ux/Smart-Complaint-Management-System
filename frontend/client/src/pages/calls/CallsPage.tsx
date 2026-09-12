import { OperationsPage } from "../operations/OperationsPage";
import { useToast } from "@/layouts/AppLayout";

/**
 * Phase 14C-6: the calls list stays on mock/demo rows. The backend exposes
 * call lifecycle only through Vapi webhooks (POST) — there is deliberately
 * no GET-all-calls or GET-call-by-id endpoint, so no list/detail call query
 * exists. Call-associated qualification/lead data resolves through those
 * real endpoints on the detail page where a genuine backend callId is used.
 * This list will switch once a backend call endpoint lands. OperationsPage
 * is shared with Qualifications/Follow-ups and is intentionally untouched.
 */
export default function CallsPage() {
  const { notify } = useToast();
  return <OperationsPage type="/calls" onToast={notify} />;
}
