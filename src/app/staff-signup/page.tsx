"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <main className="min-h-screen flex items-center justify-center bg-surface-muted px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-brand-ink">
            C
          </div>
          <h1 className="text-2xl font-bold text-ink">Staff account</h1>
          <p className="text-sm text-ink-muted">
            Use the email address your store owner added. You&apos;ll verify it in the next step.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">{error}</p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Email</label>
          <input
            type="email"
            required
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Create a password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand py-3 font-semibold text-brand-ink transition disabled:opacity-60"
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