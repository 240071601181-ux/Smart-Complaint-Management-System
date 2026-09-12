/**
 * Phase 14C-3 — Backend response envelope + resource types.
 *
 * The existing Express backend uses:
 *
 *   Success: { success: true, data: ... }
 *   Error:   { success: false, error: ... }
 *
 * Only fields actually known from the existing backend (controllers,
 * models, repositories) are included. Display-only fields from frontend
 * mock data (initials, company, route, tier colours, etc.) are NOT part
 * of these API types — keep those in `client/src/mock/*`.
 */

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  message: string;
  code?: number;
  details?: unknown;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
  /** Some endpoints also return partial `data` alongside an error. */
  data?: unknown;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export function isApiSuccess<T>(payload: ApiEnvelope<T>): payload is ApiSuccess<T> {
  return payload.success === true;
}

// ---------------------------------------------------------------------------
// Lead  (backend: src/models/lead.ts + middleware/validation.ts)
// ---------------------------------------------------------------------------

export interface Lead {
  id: string;
  source: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadInput {
  source: string;
  name: string;
  phone: string;
  email?: string;
  status?: string;
}

export interface UpdateLeadInput {
  source?: string;
  name?: string;
  phone?: string;
  email?: string;
  status?: string;
}

export interface ListLeadsInput {
  search?: string;
  page?: number;
  limit?: number;
}

export interface LeadListResult {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Qualification  (backend: src/models/Qualification.ts)
// ---------------------------------------------------------------------------

export type QualificationTier = "HOT" | "WARM" | "COLD";

export interface QualificationCriterion {
  points: number;
  qualified: boolean;
  reason: string;
}

export interface QualificationDetails {
  criteria: {
    urgency: QualificationCriterion;
    budget: QualificationCriterion;
    route: QualificationCriterion;
    vehicle: QualificationCriterion;
    cargo: QualificationCriterion;
    bookingIntent: QualificationCriterion;
  };
  totalScore: number;
  qualifiedAt: string;
}

export interface Qualification {
  id: string;
  call_id: string;
  lead_id?: string | null;
  score: number;
  tier: QualificationTier;
  details: QualificationDetails;
  qualified_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQualificationInput {
  callId: string;
}

// ---------------------------------------------------------------------------
// FollowUp  (backend: src/repositories/followupRepository.ts +
// src/services/followup/followupTypes.ts)
// ---------------------------------------------------------------------------

export type FollowupAction = "whatsapp_followup" | "crm_followup" | "missed_reminder";

export type FollowupStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface FollowUp {
  id: string;
  followup_key: string;
  lead_id: string | null;
  call_id: string | null;
  qualification_id: string | null;
  action: FollowupAction;
  payload: Record<string, unknown>;
  scheduled_at: string;
  status: FollowupStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleFollowupInput {
  leadId?: string | null;
  callId?: string | null;
  action: FollowupAction;
  scheduledAt?: string | null;
  template?: string | null;
}

export interface ExecuteDueFollowupsInput {
  limit?: number;
}

export interface ExecuteDueFollowupsResult {
  ok: boolean;
  checked: number;
  completed: number;
  failed: number;
  skipped?: "disabled";
}

// ---------------------------------------------------------------------------
// Calendar  (backend: src/repositories/calendarBookingRepository.ts)
// ---------------------------------------------------------------------------

export type CalendarBookingStatus =
  | "pending"
  | "booked"
  | "failed"
  | "skipped_unavailable"
  | "skipped_invalid_slot"
  | "skipped_tier"
  | "skipped_no_data";

export interface CalendarBooking {
  id: string;
  booking_key: string;
  lead_id: string | null;
  call_id: string | null;
  qualification_id: string | null;
  provider: string;
  calendar_id: string | null;
  external_event_id: string | null;
  meet_url: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  timezone: string | null;
  status: CalendarBookingStatus;
  attempts: number;
  slot_hash: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCalendarBookingInput {
  leadId?: string | null;
  callId?: string | null;
  start: string;
  end: string;
  timezone?: string | null;
  summary?: string | null;
  description?: string | null;
}

export interface CalendarAvailabilityQuery {
  start: string;
  end: string;
  timezone?: string | null;
}

export interface CalendarAvailabilityResult {
  available: boolean;
}

// ---------------------------------------------------------------------------
// Knowledge  (backend: src/models/Knowledge.ts)
// ---------------------------------------------------------------------------

export interface KnowledgeDocument {
  id: string;
  title: string;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface IngestKnowledgeInput {
  title: string;
  content: string;
  source?: string;
  metadata?: Record<string, unknown>;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface IngestKnowledgeResult {
  documentId: string;
  title: string;
  totalChunks: number;
  chunkIds: string[];
}

export interface SearchKnowledgeInput {
  query: string;
  topK?: number;
  documentId?: string;
  similarityThreshold?: number;
}

export interface KnowledgeSearchResult {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkText: string;
  title: string;
  source?: string | null;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface SearchKnowledgeResult {
  query: string;
  totalResults: number;
  results: KnowledgeSearchResult[];
}

// ---------------------------------------------------------------------------
// Calls  (backend: POST /api/v1/calls/start -> real Vapi outbound call)
// ---------------------------------------------------------------------------

export interface StartCallInput {
  leadId: string;
}

export interface StartCallResult {
  callId: string;
  vapiCallId: string;
  status: string;
  vapiStatus: string;
  leadId: string | null;
}

// ---------------------------------------------------------------------------
// Health  (backend: GET /health -> { status, timestamp })
// ---------------------------------------------------------------------------

export interface HealthStatus {
  status: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Agent custom LLM  (backend: src/controllers/vapiCustomLlmController.ts)
//
// OpenAI-compatible chat-completions shape — NOTE this endpoint does NOT use
// the standard { success, data } envelope. The shared httpClient passes such
// non-envelope JSON through verbatim on success.
// ---------------------------------------------------------------------------

export interface AgentChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface AgentChatCompletionInput {
  /** Required by the backend; must be a non-empty array. */
  messages: AgentChatMessage[];
  /** Optional; backend defaults to its configured agent model. */
  model?: string;
  /**
   * No call context is ever sent from this layer: without a call id the
   * orchestrator answers statelessly (no conversation state is read or
   * written). Streaming (SSE) is intentionally unsupported here.
   */
  tools?: unknown[];
}

export interface AgentChatCompletionChoice {
  index: number;
  message: {
    role: string;
    content: string;
    tool_calls?: unknown[];
  };
  finish_reason: string | null;
}

export interface AgentChatCompletionResult {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: AgentChatCompletionChoice[];
}
