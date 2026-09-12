import { Router } from 'express';
import { startCall } from '../controllers/callController';

const router = Router();

router.post('/start', startCall);

export default router;
