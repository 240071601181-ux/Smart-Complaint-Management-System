/**
 * Phase 14C-2 – demo fixtures for detail routes.
 *
 * Frontend-only/demo data (no backend list APIs exist). IDs are stable so
 * list rows can deep-link to /calls/:id, /qualifications/:id, /calendar/:id.
 */
import { leads } from "./pipeline";

export type MockCall = {
  id: string;
  leadId: string;
  direction: string;
  channel: string;
  duration: string;
  outcome: string;
  time: string;
  language: string;
  latency: string;
};

export type MockQualification = {
  id: string;
  leadId: string;
  score: number;
  tier: "HOT" | "WARM" | "COLD";
  route: string;
  factors: [string, string, number][];
};

export type MockBooking = {
  id: string;
  leadId: string;
  title: string;
  when: string;
  duration: string;
  meetUrl: string;
  status: string;
  attendees: string;
};

const leadId = (index: number) => leads[index % leads.length].id;

export const calls: MockCall[] = [
  { id: "CALL-3001", leadId: leadId(0), direction: "Outbound", channel: "Outbound · English", duration: "1m 32s", outcome: "Qualified HOT", time: "Today, 09:24", language: "English", latency: "182ms" },
  { id: "CALL-3002", leadId: leadId(1), direction: "Outbound", channel: "Outbound · Hindi", duration: "2m 04s", outcome: "Qualified HOT", time: "Today, 08:51", language: "Hindi", latency: "194ms" },
  { id: "CALL-3003", leadId: leadId(2), direction: "Inbound", channel: "Inbound · English", duration: "48s", outcome: "Follow-up", time: "Today, 08:12", language: "English", latency: "201ms" },
  { id: "CALL-3004", leadId: leadId(3), direction: "Outbound", channel: "Outbound · Hindi", duration: "1m 18s", outcome: "In review", time: "Today, 07:33", language: "Hindi", latency: "188ms" },
  { id: "CALL-3005", leadId: leadId(4), direction: "Outbound", channel: "Outbound · English", duration: "—", outcome: "No answer", time: "Yesterday, 18:47", language: "English", latency: "—" },
];

export const qualifications: MockQualification[] = [
  { id: "QUAL-4001", leadId: leadId(0), score: 92, tier: "HOT", route: "Chennai → Mumbai", factors: [["Urgency", "30 / 30", 100], ["Budget alignment", "20 / 20", 100], ["Confirmed route", "20 / 20", 100], ["Vehicle readiness", "10 / 10", 100], ["Cargo details", "8 / 10", 80], ["Booking intent", "4 / 10", 40]] },
  { id: "QUAL-4002", leadId: leadId(1), score: 87, tier: "HOT", route: "Surat → Delhi", factors: [["Urgency", "30 / 30", 100], ["Budget alignment", "18 / 20", 90], ["Confirmed route", "20 / 20", 100], ["Vehicle readiness", "10 / 10", 100], ["Cargo details", "6 / 10", 60], ["Booking intent", "3 / 10", 30]] },
  { id: "QUAL-4003", leadId: leadId(5), score: 84, tier: "HOT", route: "Bengaluru → Kochi", factors: [["Urgency", "24 / 30", 80], ["Budget alignment", "20 / 20", 100], ["Confirmed route", "20 / 20", 100], ["Vehicle readiness", "10 / 10", 100], ["Cargo details", "7 / 10", 70], ["Booking intent", "3 / 10", 30]] },
  { id: "QUAL-4004", leadId: leadId(2), score: 71, tier: "WARM", route: "Pune → Hyderabad", factors: [["Urgency", "18 / 30", 60], ["Budget alignment", "16 / 20", 80], ["Confirmed route", "20 / 20", 100], ["Vehicle readiness", "7 / 10", 70], ["Cargo details", "6 / 10", 60], ["Booking intent", "4 / 10", 40]] },
  { id: "QUAL-4005", leadId: leadId(3), score: 66, tier: "WARM", route: "Kolkata → Lucknow", factors: [["Urgency", "15 / 30", 50], ["Budget alignment", "16 / 20", 80], ["Confirmed route", "20 / 20", 100], ["Vehicle readiness", "6 / 10", 60], ["Cargo details", "6 / 10", 60], ["Booking intent", "3 / 10", 30]] },
];

export const bookings: MockBooking[] = [
  { id: "MTG-5001", leadId: leadId(0), title: "Freight review — Rao Exports", when: "Tomorrow · 10:00 IST", duration: "30 min", meetUrl: "https://meet.google.com/mdv-rao-1048", status: "Confirmed", attendees: "Arjun Rao · Maya Singh" },
  { id: "MTG-5002", leadId: leadId(1), title: "Quote walkthrough — Shah Textiles", when: "Tomorrow · 14:30 IST", duration: "30 min", meetUrl: "https://meet.google.com/mdv-shah-1047", status: "Confirmed", attendees: "Meera Shah · Maya Singh" },
  { id: "MTG-5003", leadId: leadId(2), title: "Discovery — VK Industrial", when: "12 Sep · 11:00 IST", duration: "20 min", meetUrl: "https://meet.google.com/mdv-vk-1046", status: "Tentative", attendees: "Vikram Kulkarni · Maya Singh" },
];

export const callIds = calls.map((c) => c.id);
export const qualIds = qualifications.map((q) => q.id);

export const findCall = (id: string | undefined) => calls.find((c) => c.id === id);
export const findQualification = (id: string | undefined) => qualifications.find((q) => q.id === id);
export const findBooking = (id: string | undefined) => bookings.find((b) => b.id === id);
export const findLead = (id: string | undefined) => leads.find((l) => l.id === id);
