import { Redirect } from "wouter";
import { AuthScreen } from "./AuthScreen";
import { isDemoAuthenticated } from "@/app/demoAuth";

export default function LoginPage() {
  // Already signed in (demo session): bounce into the app.
  if (isDemoAuthenticated()) return <Redirect to="/dashboard" />;
  return <AuthScreen mode="/login" />;
}
