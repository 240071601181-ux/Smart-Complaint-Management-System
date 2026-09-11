import { Router } from 'express';
import { handleIngestDocument, handleSearchKnowledge } from '../controllers/knowledgeController';

const router = Router();

router.post('/ingest', handleIngestDocument);
router.post('/search', handleSearchKnowledge);

export default router;
