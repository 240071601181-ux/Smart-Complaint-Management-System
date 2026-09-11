import { agentConfig } from '../agent/config';
import {
  updateLeadInformation,
  updateConversationState,
  endCall,
  validateUpdateLeadPayload,
  validateUpdateConversationStatePayload,
  validateEndCallPayload
} from '../agent/tools';
import { pool } from '../database';

jest.mock('../database', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { pool: mPool, default: mPool };
});

describe('Agent Configuration', () => {
  it('should have a system prompt focused strictly on collecting logistics requirements', () => {
    expect(agentConfig.systemPrompt).toContain('understand the customer\'s shipping requirements');
    expect(agentConfig.systemPrompt).toContain('Tamil, Hindi, or English');
    expect(agentConfig.systemPrompt).not.toContain('HOT');
    expect(agentConfig.systemPrompt).not.toContain('COLD');
    expect(agentConfig.systemPrompt).not.toContain('WARM');
  });

  it('should support English, Hindi, and Tamil', () => {
    expect(agentConfig.languages).toEqual(expect.arrayContaining(['en', 'hi', 'ta']));
    expect(agentConfig.supportedLanguages).toEqual(expect.arrayContaining(['en', 'hi', 'ta']));
  });

  it('should list qualification questions for collecting shipment details', () => {
    expect(agentConfig.qualificationQuestions.length).toBeGreaterThan(0);
  });
});

describe('Agent Tools & Payload Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateLeadInformation', () => {
    it('should validate valid updateLead payload', () => {
      const payload = { leadId: 'lead-123', updates: { name: 'John Logistics' } };
      const errors = validateUpdateLeadPayload(payload);
      expect(errors).toHaveLength(0);
    });

    it('should catch invalid updateLead payload', () => {
      const errors = validateUpdateLeadPayload({});
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should execute updateLeadInformation successfully with mocked DB', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'lead-123', name: 'New Name', source: 'vapi', phone: '1234567890', email: null, status: 'new' }]
      });
      const res = await updateLeadInformation({ leadId: 'lead-123', updates: { name: 'New Name' } });
      expect(res.success).toBe(true);
      expect(res.message).toContain('updated successfully');
    });
  });

  describe('updateConversationState', () => {
    it('should validate valid updateConversationState payload', () => {
      const payload = {
        callId: 'call-123',
        updates: {
          pickup_location: 'Mumbai',
          cargo_weight: 1200,
          budget: 50000
        }
      };
      const errors = validateUpdateConversationStatePayload(payload);
      expect(errors).toHaveLength(0);
    });

    it('should catch type mismatch in cargo_weight and budget', () => {
      const payload = {
        callId: 'call-123',
        updates: {
          cargo_weight: 'heavy' as any,
          budget: 'cheap' as any
        }
      };
      const errors = validateUpdateConversationStatePayload(payload);
      expect(errors).toContain('cargo_weight must be a number');
      expect(errors).toContain('budget must be a number');
    });

    it('should execute updateConversationState successfully with mocked DB', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'state-1', call_id: 'call-123', pickup_location: 'Delhi' }]
      });
      const res = await updateConversationState({
        callId: 'call-123',
        updates: { pickup_location: 'Delhi' }
      });
      expect(res.success).toBe(true);
      expect(res.message).toContain('updated successfully');
    });
  });

  describe('endCall', () => {
    it('should validate valid endCall payload', () => {
      const errors = validateEndCallPayload({ callId: 'call-123', reason: 'Customer completed requirements' });
      expect(errors).toHaveLength(0);
    });

    it('should catch missing callId in endCall payload', () => {
      const errors = validateEndCallPayload({});
      expect(errors).toContain('callId is required and must be a string');
    });

    it('should execute endCall and update internal call status with mocked DB', async () => {
      // findCallByVapiId (first query)
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'call-123', vapi_call_id: 'call-123', status: 'initiated', started_at: new Date().toISOString() }]
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'call-123', vapi_call_id: 'call-123', status: 'initiated' }]
      });
      // upsertCall (second query)
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 'call-123', vapi_call_id: 'call-123', status: 'ended' }]
      });
      const res = await endCall({ callId: 'call-123' });
      expect(res.success).toBe(true);
      expect(res.message).toContain('Call ended');
    });
  });
});
