import { Router } from 'express';
import { createLead, getLead, listLeads, updateLead } from '../controllers/leadController';

const router = Router();

router.post('/', createLead);
router.get('/', listLeads);
router.get('/:id', getLead);
router.patch('/:id', updateLead);

export default router;
