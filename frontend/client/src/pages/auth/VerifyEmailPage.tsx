import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { AmbientShards, Button, Logo } from "@/components/app/ui";
import { demoLogin, getDemoSession } from "@/app/demoAuth";

/** Demo-only: code verification is local UI state, no backend call. */
export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const [resent, setResent] = useState(false);
  return (
    <div className="auth-screen">
      <div className="auth-aside">
        <AmbientShards variant="auth" />
        <Logo />
        <div className="auth-aside-copy">
          <span className="section-kicker">VOICE-LED LOGISTICS OPS</span>
          <h1>Talk. Qualify.<br /><em>Move logistics forward.</em></h1>
          <p>MadVoice AI turns every logistics conversation into a qualified, actionable next step.</p>
        </div>
        <div className="auth-proof">
          <span><CheckCircle2 size={15} />AI qualification in real time</span>
          <span><CheckCircle2 size={15} />Built for freight operations</span>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-form">
          <button className="auth-mobile-logo" onClick={() => navigate("/dashboard")}><Logo /></button>
          <span className="section-kicker">VERIFY ACCESS</span>
          <h2>Check your inbox</h2>
          <p>We sent a 6-digit verification code to your work email.</p>
          <label>Verification code<input placeholder="0 0 0 0 0 0" /></label>
          {resent && <p style={{ display: "flex", gap: 8, alignItems: "center" }}><CheckCircle2 size={15} />A new code is on its way.</p>}
          <Button variant="primary" className="auth-submit" onClick={() => {
            // Completing verification signs the demo account in (idempotent).
            demoLogin(getDemoSession()?.email ?? "demo@acmecargo.in");
            navigate("/dashboard");
          }}>
            Verify email<ArrowUpRight size={15} />
          </Button>
          <div className="auth-footer">
            <button onClick={() => navigate("/login")}>Back to sign in</button>
            <span>Didn’t get a code? <button onClick={() => setResent(true)}>Resend</button></span>
          </div>
          <small className="legal-copy">By continuing, you agree to MadVoice AI’s Terms of Service and Privacy Policy.</small>
        </div>
      </div>
    </div>
  );
}
