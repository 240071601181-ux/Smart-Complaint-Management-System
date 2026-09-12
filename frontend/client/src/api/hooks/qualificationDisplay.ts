/**
 * Phase 14C-5 — Backend Qualification -> display adapter.
 *
 * Maps the backend qualification's real `details.criteria` (urgency, budget,
 * route, vehicle, cargo, bookingIntent — each with backend-computed `points`,
 * `qualified`, `reason`) onto the factor rows the UI renders. No scoring is
 * duplicated or invented: bar fill follows the backend's own `qualified`
 * boolean and labels show the backend's `points`.
 */

import type { Qualification as ApiQualification } from "../types";

export interface CriterionDisplayRow {
  key: string;
  label: string;
  points: number;
  qualified: boolean;
  reason: string;
}

const CRITERION_LABELS: Array<{ key: keyof ApiQualification["details"]["criteria"]; label: string }> = [
  { key: "urgency", label: "Urgency" },
  { key: "budget", label: "Budget alignment" },
  { key: "route", label: "Confirmed route" },
  { key: "vehicle", label: "Vehicle readiness" },
  { key: "cargo", label: "Cargo details" },
  { key: "bookingIntent", label: "Booking intent" },
];

export function criterionDisplayRows(qualification: ApiQualification): CriterionDisplayRow[] {
  return CRITERION_LABELS.map(({ key, label }) => {
    const criterion = qualification.details.criteria[key];
    return {
      key,
      label,
      points: criterion.points,
      qualified: criterion.qualified,
      reason: criterion.reason,
    };
  });
}

export function formatQualifiedAt(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  return new Date(iso).toLocaleString();
}
