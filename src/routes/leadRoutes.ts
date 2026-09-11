import { Router } from 'express';
import { createLead, getLead, updateLead } from '../controllers/leadController';

const router = Router();

router.post('/', createLead);
router.get('/:id', getLead);
router.patch('/:id', updateLead);

export default router;
