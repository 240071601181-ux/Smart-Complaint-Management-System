import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import leadRoutes from './routes/leadRoutes';
import vapiWebhookRoutes from './routes/vapiWebhookRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import { handleCustomLlmChatCompletions } from './controllers/vapiCustomLlmController';
import { handleVapiToolCalls } from './controllers/vapiToolController';
import qualificationRoutes from './routes/qualificationRoutes';
import calendarRoutes from './routes/calendarRoutes';
import followupRoutes from './routes/followupRoutes';

// Load environment variables
dotenv.config({ path: '.env' });

const app = express();
app.use(express.json());



// Simple health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Custom LLM OpenAI-compatible endpoint for Vapi
app.post('/api/v1/vapi/custom-llm/chat/completions', handleCustomLlmChatCompletions);
app.post('/api/v1/vapi/custom-llm/chat/completions/custom-tool', handleVapiToolCalls);

// API routes (versioned)
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/webhooks/vapi', vapiWebhookRoutes);
app.use('/api/v1/knowledge', knowledgeRoutes);
app.use('/api/v1/qualifications', qualificationRoutes);
app.use('/api/v1/calendar', calendarRoutes);
app.use('/api/v1/followups', followupRoutes);

// Centralized error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err });
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ success: false, error: { message, code: status } });
});

// Export app for testing or external usage
export default app;

// Start server only when this file is executed directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}
