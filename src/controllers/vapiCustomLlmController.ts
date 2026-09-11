import { Request, Response, NextFunction } from 'express';
import { orchestrator } from '../agent/orchestrator';
import { findCallByVapiId } from '../repositories/callRepository';
import { logger } from '../utils/logger';

const getVapiCallId = (body: any, req: Request): string | undefined => {
  const callId = body?.call?.id || body?.message?.call?.id || body?.callId;
  if (typeof callId === 'string' && callId.length > 0) return callId;
  const headerCallId = req.headers['x-vapi-call-id'];
  return typeof headerCallId === 'string' ? headerCallId : undefined;
};

const resolveInternalCallId = async (vapiCallId?: string): Promise<string | undefined> => {
  if (!vapiCallId) return undefined;
  try {
    const call = await findCallByVapiId(vapiCallId);
    return call?.id || vapiCallId;
  } catch (err: any) {
    logger.warn('Unable to resolve Vapi call id to an internal call id', {
      vapiCallId,
      error: err.message
    });
    return vapiCallId;
  }
};

const normalizeMessageContent = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(part => typeof part === 'string' ? part : (part as any)?.text || '')
      .join('');
  }
  return content == null ? '' : String(content);
};

/**
 * Custom LLM endpoint for Vapi: POST /api/v1/vapi/custom-llm/chat/completions
 * Acts as an OpenAI-compatible server endpoint for Vapi voice engine.
 */
export const handleCustomLlmChatCompletions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { model, messages, stream, tools } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: {
          message: 'messages array is required',
          type: 'invalid_request_error',
          code: 400
        }
      });
    }

    const vapiCallId = getVapiCallId(req.body, req);
    const callId = await resolveInternalCallId(vapiCallId);
    const normalizedMessages = messages.map((message: any) => ({
      ...message,
      content: normalizeMessageContent(message.content)
    }));
    const requestedModel = model || 'vapi-logistics-agent';

    logger.info('Received Vapi Custom LLM chat completions request', {
      model: requestedModel,
      stream: !!stream,
      callId,
      messageCount: normalizedMessages.length
    });

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const responseId = `chatcmpl-${Date.now()}`;
      const created = Math.floor(Date.now() / 1000);

      const response = await orchestrator.processTurn({
        callId,
        messages: normalizedMessages,
        tools,
        stream: true,
        onStreamChunk: (chunk: string) => {
          const sseData = {
            id: responseId,
            object: 'chat.completion.chunk',
            created,
            model: requestedModel,
            choices: [
              {
                index: 0,
                delta: { content: chunk },
                finish_reason: null
              }
            ]
          };
          res.write(`data: ${JSON.stringify(sseData)}\n\n`);
        }
      });

      const toolCalls = response.toolCalls || [];
      if (toolCalls.length > 0) {
        res.write(`data: ${JSON.stringify({
          id: responseId,
          object: 'chat.completion.chunk',
          created,
          model: requestedModel,
          choices: [{
            index: 0,
            delta: { tool_calls: toolCalls },
            finish_reason: 'tool_calls'
          }]
        })}\n\n`);
      }

      // Write final stop chunk and DONE marker
      const finalSse = {
        id: responseId,
        object: 'chat.completion.chunk',
        created,
        model: requestedModel,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop'
          }
        ]
      };
      res.write(`data: ${JSON.stringify(finalSse)}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    } else {
      const response = await orchestrator.processTurn({
        callId,
        messages: normalizedMessages,
        tools,
        stream: false
      });

      return res.status(200).json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: response.content || '',
              ...(response.toolCalls ? { tool_calls: response.toolCalls } : {})
            },
            finish_reason: response.finishReason || 'stop'
          }
        ]
      });
    }
  } catch (err) {
    next(err);
  }
};
