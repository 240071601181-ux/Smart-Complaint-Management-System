import { pool } from '../database';
import { initializeState, getStateByCallId, updateState } from '../services/conversationStateService';
import { findStateByCallId, createState, updateState as repoUpdateState } from '../repositories/conversationStateRepository';

jest.mock('../database', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { pool: mPool, default: mPool };
});

describe('Conversation State Service & Repository', () => {
  const mockCallId = '11111111-1111-1111-1111-111111111111';
  const mockLeadId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeState', () => {
    it('should initialize conversation state with internal call_id and nullable lead_id', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // findStateByCallId -> null
        .mockResolvedValueOnce({
          rows: [{
            id: '33333333-3333-3333-3333-333333333333',
            call_id: mockCallId,
            lead_id: mockLeadId,
            customer_name: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        });

      const state = await initializeState(mockCallId, mockLeadId);
      expect(state).toBeDefined();
      expect(state.call_id).toBe(mockCallId);
      expect(state.lead_id).toBe(mockLeadId);
    });

    it('should allow nullable lead_id when initializing state', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // findStateByCallId -> null
        .mockResolvedValueOnce({
          rows: [{
            id: '33333333-3333-3333-3333-333333333333',
            call_id: mockCallId,
            lead_id: null,
            customer_name: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        });

      const state = await initializeState(mockCallId, null);
      expect(state).toBeDefined();
      expect(state.call_id).toBe(mockCallId);
      expect(state.lead_id).toBeNull();
    });

    it('should be idempotent and return existing state if already initialized', async () => {
      const existingState = {
        id: '33333333-3333-3333-3333-333333333333',
        call_id: mockCallId,
        lead_id: mockLeadId,
        customer_name: 'Existing Customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [existingState] }); // findStateByCallId -> existing

      const state = await initializeState(mockCallId, mockLeadId);
      expect(state).toEqual(existingState);
      // Ensure INSERT query was NOT executed
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateState', () => {
    it('should update conversation state fields for a call', async () => {
      const updatedState = {
        id: '33333333-3333-3333-3333-333333333333',
        call_id: mockCallId,
        pickup_location: 'Chennai',
        destination: 'Bengaluru',
        cargo_weight: 500,
        budget: 15000,
        urgency: 'HIGH',
      };

      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [updatedState] });

      const result = await updateState(mockCallId, {
        pickup_location: 'Chennai',
        destination: 'Bengaluru',
        cargo_weight: 500,
        budget: 15000,
        urgency: 'HIGH',
      });

      expect(result).toEqual(updatedState);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversation_state SET'),
        expect.arrayContaining(['Chennai', 'Bengaluru', 500, 15000, 'HIGH', mockCallId])
      );
    });
  });

  describe('state isolation', () => {
    it('should maintain distinct state for different calls', async () => {
      const call1 = '11111111-1111-1111-1111-111111111111';
      const call2 = '44444444-4444-4444-4444-444444444444';

      const state1 = { id: 's1', call_id: call1, pickup_location: 'City A' };
      const state2 = { id: 's2', call_id: call2, pickup_location: 'City B' };

      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [state1] })
        .mockResolvedValueOnce({ rows: [state2] });

      const res1 = await getStateByCallId(call1);
      const res2 = await getStateByCallId(call2);

      expect(res1?.pickup_location).toBe('City A');
      expect(res2?.pickup_location).toBe('City B');
    });
  });
});
