import { OperationsPage } from "../operations/OperationsPage";
import { useToast } from "@/layouts/AppLayout";

/**
 * Phase 14C-5: the qualifications list stays on mock/demo rows. The backend
 * exposes no list-all endpoint (only GET by call/lead and POST), so no list
 * query exists — see `api/hooks/useQualifications.ts`. Detail pages resolve
 * through those endpoints where an associated record exists. This list will
 * switch to a real query once a backend list endpoint lands. OperationsPage
 * is shared with Calls/Follow-ups and is intentionally untouched.
 */
export default function QualificationsPage() {
  const { notify } = useToast();
  return <OperationsPage type="/qualifications" onToast={notify} />;
}
