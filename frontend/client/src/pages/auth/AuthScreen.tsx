import { useState } from "react";
import { useLocation } from "wouter";
import { AmbientShards, Button, Logo } from "@/components/app/ui";
import {
  ArrowUpRight,
  CheckCircle2,
  Cloud,
  Send,
} from "lucide-react";
import { demoLogin, getDemoSession } from "@/app/demoAuth";

/**
 * Phase 14C-AUTH-FIX — UI-only auth screens (login / signup / forgot-password).
 *
 * No backend calls, no credential verification. Submitting the login/signup
 * form establishes the UI-only demo session (`app/demoAuth`) and navigates
 * into the app; RequireAuth enforces it. Real authentication lands later.
 */
export function AuthScreen({ mode }: { mode: string }) {
  const [, navigate] = useLocation();
  const [show, setShow] = useState(false);
  // UI-only preference state; nothing is persisted and no session is created.
  const [remember, setRemember] = useState(false);
  // Forgot-password confirmation state (UI only; no email is actually sent).
  const [resetSent, setResetSent] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const isSignup = mode === "/signup";
  const isForgot = mode === "/forgot-password";
  const isLogin = !isSignup && !isForgot;
  const title = isSignup ? "Create your operations workspace" : isForgot ? "Reset your access" : "Welcome back to the signal";
  const subtitle = isSignup
    ? "Set up your workspace in under two minutes."
    : isForgot
      ? "Enter your work email and we'll send you a reset link."
      : "Sign in to continue where your pipeline left off.";

  const handleSubmit = () => {
    if (isForgot) {
      if (!email.trim()) {
        setFormError("Enter your work email to receive the reset link.");
        return;
      }
      setFormError(null);
      setResetSent(true);
      return;
    }
    if (isSignup && !fullName.trim()) {
      setFormError("Enter your full name to create the workspace.");
      return;
    }
    if (!email.trim()) {
      setFormError("Enter your work email to continue.");
      return;
    }
    if (!password) {
      setFormError("Enter your password to continue.");
      return;
    }
    setFormError(null);
    // Demo login: establish the UI-only demo session (no verification).
    demoLogin(email.trim());
    navigate(isSignup ? "/account-created" : "/dashboard");
  };

  const handleSso = () => {
    // Demo SSO: same UI-only demo session as email login.
    demoLogin((getDemoSession()?.email ?? email.trim()) || "demo@acmecargo.in");
    navigate("/dashboard");
  };

  return <div className="auth-screen"><div className="auth-aside"><AmbientShards variant="auth" /><Logo /><div className="auth-aside-copy"><span className="section-kicker">VOICE-LED LOGISTICS OPS</span><h1>Talk. Qualify.<br /><em>Move logistics forward.</em></h1><p>MadVoice AI turns every logistics conversation into a qualified, actionable next step.</p></div><div className="auth-proof"><span><CheckCircle2 size={15} />AI qualification in real time</span><span><CheckCircle2 size={15} />Built for freight operations</span></div></div><div className="auth-panel"><div className="auth-form"><button className="auth-mobile-logo" onClick={() => navigate("/dashboard")}><Logo /></button><span className="section-kicker">{isSignup ? "GET STARTED" : "SECURE ACCESS"}</span><h2>{title}</h2><p>{subtitle}</p>{isLogin && <Button variant="secondary" className="sso-btn" icon={Cloud} onClick={handleSso}>Continue with Google Workspace</Button>}{isLogin && <div className="or-divider"><span>or continue with email</span></div>}{isSignup && <label>Full name<input placeholder="Maya Singh" value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>}<label>Work email<input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>{!isForgot && <label>Password<div className="password-field"><input type={show ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} /><button onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button></div></label>}{isSignup && <label>Company name<input placeholder="Acme Cargo" value={company} onChange={(e) => setCompany(e.target.value)} /></label>}{isLogin && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}><label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 7, marginTop: 0, cursor: "pointer" }}><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ width: 14, height: 14, accentColor: "#00f0ff" }} />Remember me</label></div>}{formError && <p style={{ color: "#f87171", fontSize: 10, marginTop: 12 }}>{formError}</p>}{isForgot && resetSent ? <p style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 16 }}><CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />Reset link sent. Check your inbox, then choose a new password.</p> : <Button variant="primary" className="auth-submit" onClick={handleSubmit}>{isForgot ? <><Send size={15} />Send reset link</> : isSignup ? <>Create account<ArrowUpRight size={15} /></> : <>Sign in<ArrowUpRight size={15} /></>}</Button>}<div className="auth-footer">{isForgot ? <><button onClick={() => navigate("/login")}>Back to sign in</button>{resetSent && <button onClick={() => navigate("/reset-password")}>Continue to new password</button>}</> : isSignup ? <span>Already have an account? <button onClick={() => navigate("/login")}>Sign in</button></span> : <><button onClick={() => navigate("/forgot-password")}>Forgot password?</button><span>New to MadVoice? <button onClick={() => navigate("/signup")}>Create account</button></span></>}</div><small className="legal-copy">By continuing, you agree to MadVoice AI’s Terms of Service and Privacy Policy.</small></div></div></div>;
}
