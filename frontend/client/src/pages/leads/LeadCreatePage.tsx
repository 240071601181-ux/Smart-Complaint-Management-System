import { useState } from "react";
import { useLocation } from "wouter";
import { Check, ChevronLeft } from "lucide-react";
import { Button, Card } from "@/components/app/ui";
import { useToast } from "@/layouts/AppLayout";
import { useCreateLeadMutation } from "@/api/hooks/useLeads";
import { getUserMessage } from "@/api/errors";
import type { CreateLeadInput } from "@/api/types";

type FormValues = { source: string; name: string; phone: string; email: string; status: string };

const EMPTY: FormValues = { source: "", name: "", phone: "", email: "", status: "" };

/**
 * Phase 14C-4 — Create Lead backed by POST /api/v1/leads.
 *
 * Maps only backend-supported fields (source, name, phone, email, status).
 * On success navigates to /leads/:id, which fetches the new record from the
 * backend. On failure the entered data is preserved for retry.
 */
export default function LeadCreatePage() {
  const [, navigate] = useLocation();
  const { notify } = useToast();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const mutation = useCreateLeadMutation();

  const set = (key: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setFieldErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  const handleSubmit = () => {
    if (mutation.isPending) return; // prevent duplicate submission
    const errs: Partial<Record<keyof FormValues, string>> = {};
    if (!values.source.trim()) errs.source = "Source is required.";
    if (!values.name.trim()) errs.name = "Full name is required.";
    if (!values.phone.trim()) errs.phone = "Phone is required.";
    if (values.email.trim() && !/^\S+@\S+\.\S+$/.test(values.email.trim())) {
      errs.email = "Enter a valid email or leave it empty.";
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload: CreateLeadInput = {
      source: values.source.trim(),
      name: values.name.trim(),
      phone: values.phone.trim(),
    };
    if (values.email.trim()) payload.email = values.email.trim();
    if (values.status.trim()) payload.status = values.status.trim();

    setSubmitError(null);
    mutation.mutate(payload, {
      onSuccess: (lead) => {
        notify("Lead created");
        navigate(`/leads/${lead.id}`);
      },
      onError: (error) => setSubmitError(getUserMessage(error)),
    });
  };

  const err = (key: keyof FormValues) =>
    fieldErrors[key] ? (
      <small style={{ color: "#f87171", fontSize: 10 }}>{fieldErrors[key]}</small>
    ) : null;

  return (
    <>
      <button className="back-link" onClick={() => navigate("/leads")}><ChevronLeft size={15} />Back to leads</button>
      <div className="page-heading">
        <div><p className="lede">PIPELINE / LEADS / NEW</p></div>
        <div className="heading-actions">
          <Button variant="ghost" onClick={() => navigate("/leads")} disabled={mutation.isPending}>Cancel</Button>
          <Button icon={Check} variant="primary" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create lead"}
          </Button>
        </div>
      </div>
      <Card className="settings-form">
        <div className="settings-section">
          <span className="section-kicker">SHIPPER PROFILE</span>
          <h2>New lead</h2>
          <p>Only backend-supported fields are collected here. The new record is created via POST /api/v1/leads.</p>
          <div className="form-grid">
            <label>Full name<input value={values.name} onChange={set("name")} placeholder="e.g. Arjun Rao" />{err("name")}</label>
            <label>Phone<input value={values.phone} onChange={set("phone")} placeholder="e.g. +91 98765 22109" />{err("phone")}</label>
            <label>Source<input value={values.source} onChange={set("source")} placeholder="e.g. web, inbound-call" />{err("source")}</label>
            <label>Email<input value={values.email} onChange={set("email")} placeholder="optional" />{err("email")}</label>
            <label>Status<input value={values.status} onChange={set("status")} placeholder="optional, e.g. New" />{err("status")}</label>
          </div>
          {submitError ? (
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: "#f87171", fontSize: 11 }}>{submitError}</span>
              <Button variant="secondary" onClick={handleSubmit} disabled={mutation.isPending}>Retry</Button>
            </div>
          ) : null}
        </div>
      </Card>
    </>
  );
}
