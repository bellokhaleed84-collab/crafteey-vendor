"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyAuthError } from "@/lib/authErrors";

export default function StaffSignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      // Creates the account and emails a verification link.
      await signUp(email.trim(), password);
      // The dashboard checks for your invite and asks you to verify your email.
      router.replace("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="space-y-1">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-2xl font-black text-white">
            C
          </div>
          <h1 className="text-2xl font-bold text-ink">Staff account</h1>
          <p className="text-sm text-ink-muted">
            Use the email address your store owner added. You&apos;ll verify it in the next step.
          </p>
        </div>

        {error && (
          <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink">Email</label>
          <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-white px-4 focus-within:border-brand">
            <Mail size={18} className="shrink-0 text-ink-faint" />
            <input
              type="email"
              required
              autoCapitalize="none"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink">Create a password</label>
          <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-white px-4 focus-within:border-brand">
            <Lock size={18} className="shrink-0 text-ink-faint" />
            <input
              type="password"
              required
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink transition disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Create staff account"}
        </button>

        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login?as=staff" className="font-semibold text-brand-dark">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}