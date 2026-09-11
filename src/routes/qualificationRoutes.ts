import { Router } from 'express';
import {
  createQualification,
  getQualificationByCall,
  getQualificationByLead
} from '../controllers/qualificationController';

const router = Router();

router.post('/', createQualification);
router.get('/calls/:callId', getQualificationByCall);
router.get('/leads/:leadId', getQualificationByLead);

export default router;