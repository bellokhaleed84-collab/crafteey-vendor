"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
          "This email hasn't been added as staff yet. Ask your store owner to add it in Settings → Staff."
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
    <main className="min-h-screen flex items-center justify-center bg-surface-muted px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-brand-ink">
            C
          </div>
          <h1 className="text-2xl font-bold text-ink">{isStaff ? "Staff login" : "Welcome Back!"}</h1>
          <p className="text-sm text-ink-muted">
            {isStaff
              ? "Log in to handle orders for your store."
              : "Log in to manage your store and orders."}
          </p>
        </div>

        {/* Owner / staff switch */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-border p-1">
          {(["owner", "staff"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
              }`}
            >
              {m === "owner" ? "Store owner" : "Staff"}
            </button>
          ))}
        </div>

        {error && (
          <p className="rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg bg-status-success-bg p-2 text-sm text-status-success">
            {notice}
          </p>
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
          <label className="mb-1 block text-sm font-medium text-ink">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={handleReset}
            className="mt-1.5 text-xs font-medium text-brand-dark"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand py-3 font-semibold text-brand-ink transition disabled:opacity-60"
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
              Register
            </Link>
          </p>
        )}
      </form>
    </main>
  );
}