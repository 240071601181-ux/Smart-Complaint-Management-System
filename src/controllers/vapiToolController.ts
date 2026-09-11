import { Request, Response, NextFunction } from 'express';
import { updateConversationState, updateLeadInformation, endCall } from '../agent/tools';
import { findCallByVapiId } from '../repositories/callRepository';
import { logger } from '../utils/logger';

export interface NormalizedToolCall {
  toolCallId: string;
  name: string;
  arguments: any;
}

const parseArguments = (value: unknown): any => {
  if (typeof value !== 'string') return value || {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const getCallId = (body: any, req: Request): string | undefined => {
  const callId = body?.message?.call?.id || body?.call?.id || body?.message?.callId || body?.callId;
  if (typeof callId === 'string' && callId.length > 0) return callId;
  const headerCallId = req.headers['x-vapi-call-id'];
  return typeof headerCallId === 'string' ? headerCallId : undefined;
};

/**
 * Normalizes toolCallList and toolWithToolCallList variants from Vapi webhook payload.
 */
export const normalizeVapiToolCalls = (body: any): NormalizedToolCall[] => {
  const normalized: NormalizedToolCall[] = [];
  const msg = body?.message || body || {};

  // Variant 1: toolWithToolCallList
  const toolWithToolCallList = msg.toolWithToolCallList || body.toolWithToolCallList;
  if (Array.isArray(toolWithToolCallList)) {
    for (const item of toolWithToolCallList) {
      const tc = item.toolCall || item.tool_call || item;
      const toolCallId = tc.id || item.id || `tc_${Math.random().toString(36).substring(2, 9)}`;
      const fn = tc.function || item.function || item.tool?.function || {};
      const name = fn.name || tc.name || item.name || item.tool?.name;
      const args = parseArguments(
        fn.arguments ?? tc.arguments ?? fn.parameters ?? tc.parameters ?? item.arguments ?? item.tool?.arguments
      );
      if (name) {
        normalized.push({ toolCallId, name, arguments: args });
      }
    }
  }

  // Variant 2: toolCallList
  const toolCallList = msg.toolCallList || body.toolCallList;
  if (Array.isArray(toolCallList)) {
    for (const item of toolCallList) {
      const toolCallId = item.id || item.toolCallId || `tc_${Math.random().toString(36).substring(2, 9)}`;
      const fn = item.function || item.tool?.function || item;
      const name = fn.name || item.name || item.tool?.name;
      const args = parseArguments(fn.arguments ?? fn.parameters ?? item.arguments ?? item.tool?.arguments);
      if (name) {
        normalized.push({ toolCallId, name, arguments: args });
      }
    }
  }

  return normalized.filter((call, index, calls) =>
    calls.findIndex(candidate => candidate.toolCallId === call.toolCallId) === index
  );
};

/**
 * Endpoint for Vapi tool execution: POST /api/v1/webhooks/vapi/tools
 */
export const handleVapiToolCalls = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vapiCallId = getCallId(req.body, req);
    const toolCalls = await Promise.all(normalizeVapiToolCalls(req.body).map(async call => {
      if (!['updateConversationState', 'endCall'].includes(call.name) || call.arguments.callId || !vapiCallId) {
        return call;
      }
      let internalCall;
      try {
        internalCall = await findCallByVapiId(vapiCallId);
      } catch (err: any) {
        logger.warn('Unable to resolve Vapi tool call id to an internal call id', {
          vapiCallId,
          error: err.message
        });
      }
      return {
        ...call,
        arguments: { ...call.arguments, callId: internalCall?.id || vapiCallId }
      };
    }));
    logger.info('Received Vapi tool calls', { count: toolCalls.length, toolCalls });

    if (toolCalls.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const results = [];
    for (const call of toolCalls) {
      let toolResult: any;
      if (call.name === 'updateConversationState') {
        toolResult = await updateConversationState(call.arguments);
      } else if (call.name === 'updateLeadInformation') {
        toolResult = await updateLeadInformation(call.arguments);
      } else if (call.name === 'endCall') {
        toolResult = await endCall(call.arguments);
      } else {
        toolResult = { success: false, message: `Unknown tool name: ${call.name}` };
      }

      results.push({
        toolCallId: call.toolCallId,
        result: toolResult.message || (toolResult.errors ? toolResult.errors.join(', ') : 'Tool execution finished')
      });
    }

    return res.status(200).json({ results });
  } catch (err) {
    next(err);
  }
};
