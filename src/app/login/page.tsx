"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyAuthError } from "@/lib/authErrors";
import { fetchMyVendor, routeForVendor } from "@/lib/vendorApi";
import { fetchMyStaffAccess } from "@/lib/staffApi";

type Mode = "owner" | "staff";

export default function LoginPage() {
  const { signIn, signOut, getToken, resetPassword } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // /login?as=staff opens the staff side directly (used by the staff sign-up page).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("as") === "staff") setMode("staff");
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);

      const token = await getToken();
      if (!token) throw new Error("Couldn't verify your session. Try again.");

      if (mode === "owner") {
        const vendor = await fetchMyVendor(token);
        if (vendor) {
          router.replace(routeForVendor(vendor));
          return;
        }
        // Not a store owner. Is it a staff account?
        const staff = await fetchMyStaffAccess(token);
        await signOut();
        if (staff.kind === "staff" || staff.kind === "needs_verification") {
          setError("This is a staff account. Switch to Staff login above.");
        } else {
          setError("No store is linked to this account. Register your store, or use Staff login if you work at a store.");
        }
        return;
      }

      // Staff login
      const staff = await fetchMyStaffAccess(token);
      if (staff.kind === "staff") {
        router.replace("/dashboard/orders");
        return;
      }
      if (staff.kind === "needs_verification") {
        // The dashboard guard shows the verify-your-email screen.
        router.replace("/dashboard");
        return;
      }
      // Not staff. Is it a store owner account?
      const vendor = await fetchMyVendor(token);
      await signOut();
      if (vendor) {
        setError("This is a store owner account. Switch to Store owner login above.");
      } else {
        setError(
          "This email hasn't been added as staff yet. Ask your store owner to add it in Settings \u2192 Staff."
        );
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Enter your email above first, then tap Forgot password.");
      return;
    }
    try {
      await resetPassword(email.trim());
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code !== "auth/user-not-found") {
        setError(friendlyAuthError(err));
        return;
      }
    }
    setNotice("If an account exists for that email, a reset link is on its way.");
  };

  const isStaff = mode === "staff";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="space-y-1">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-2xl font-black text-white">
            C
          </div>
          <h1 className="text-2xl font-bold text-ink">{isStaff ? "Staff login" : "Welcome Back"}</h1>
          <p className="text-sm text-ink-muted">
            {isStaff
              ? "Log in to handle orders for your store."
              : "Log in to your Crafteey Vendors account."}
          </p>
        </div>

        {/* Owner / staff switch */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1">
          {(["owner", "staff"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === m ? "bg-white text-ink shadow-sm" : "text-ink-muted"
              }`}
            >
              {m === "owner" ? "Store owner" : "Staff"}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
        )}
        {notice && (
          <p className="rounded-xl bg-status-success-bg p-3 text-sm text-status-success">{notice}</p>
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
          <label className="mb-1.5 block text-xs font-semibold text-ink">Password</label>
          <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-white px-4 focus-within:border-brand">
            <Lock size={18} className="shrink-0 text-ink-faint" />
            <input
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-brand-dark"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink transition disabled:opacity-60"
        >
          {loading ? "Logging in..." : isStaff ? "Log in as staff" : "Log In"}
        </button>

        {isStaff ? (
          <p className="text-center text-sm text-ink-muted">
            New staff member?{" "}
            <Link href="/staff-signup" className="font-semibold text-brand-dark">
              Create your staff account
            </Link>
          </p>
        ) : (
          <p className="text-center text-sm text-ink-muted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-brand-dark">
              Sign Up
            </Link>
          </p>
        )}
      </form>
    </main>
  );
}