import { IntegrationPage } from "../integrations/IntegrationPage";
import { useToast } from "@/layouts/AppLayout";

/**
 * Phase 14C-9: the knowledge inventory stays mock. The backend exposes only
 * POST /api/v1/knowledge/ingest and POST /api/v1/knowledge/search — no
 * document-list and no document-detail endpoint — so no list/detail hooks
 * exist (see `api/hooks/useKnowledge.ts`). Search (/knowledge/search) and
 * ingestion (/knowledge/ingest) are live; this overview switches once a
 * backend list endpoint lands. IntegrationPage is shared and untouched.
 */
export default function KnowledgePage() {
  const { notify } = useToast();
  return <IntegrationPage type="/knowledge" onToast={notify} />;
}
