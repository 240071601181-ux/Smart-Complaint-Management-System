import { Router } from 'express';
import { handleVapiWebhook } from '../controllers/vapiWebhookController';
import { handleVapiToolCalls } from '../controllers/vapiToolController';

const router = Router();

router.post('/', handleVapiWebhook);
router.post('/tools', handleVapiToolCalls);

export default router;
