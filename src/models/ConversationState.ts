export interface ConversationState {
  id: string; // UUID
  call_id: string; // UUID reference to calls.id
  lead_id?: string | null;
  customer_name?: string | null;
  pickup_location?: string | null;
  destination?: string | null;
  vehicle_type?: string | null;
  cargo_type?: string | null;
  cargo_weight?: number | null;
  cargo_dimensions?: string | null;
  required_date?: string | null; // ISO date
  budget?: number | null;
  urgency?: string | null;
  booking_intent?: 'explicit' | 'not_explicit' | 'unknown' | null;
  additional_requirements?: string | null;
  created_at: string;
  updated_at: string;
}
