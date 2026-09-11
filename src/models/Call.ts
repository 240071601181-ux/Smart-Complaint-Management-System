export interface Call {
  id: string; // UUID
  lead_id?: string | null;
  vapi_call_id: string;
  status: string;
  started_at?: string | null; // ISO timestamp
  answered_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
  created_at: string;
  updated_at: string;
}
