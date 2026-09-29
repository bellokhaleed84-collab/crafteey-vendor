"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { VENDOR_CATEGORIES } from "@/lib/vendorCategories";
import { friendlyAuthError } from "@/lib/authErrors";

type FormState = {
  businessName: string;
  email: string;
  password: string;
  phone: string;
  category: string;
  address: string;
  verificationDocUrl: string;
};

const REQUEST_TIMEOUT_MS = 20000;

function validateStep(step: number, form: FormState): string | null {
  if (step === 1) {
    if (form.businessName.trim().length < 2) return "Enter your business name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
  }
  if (step === 2) {
    if (!/^\+?\d{10,15}$/.test(form.phone.replace(/[\s-]/g, ""))) {
      return "Enter a valid phone number.";
    }
    if (form.address.trim().length < 5) return "Enter your full store address.";
  }
  if (step === 3 && form.verificationDocUrl.trim()) {
    try {
      const parsed = new URL(form.verificationDocUrl.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("bad protocol");
      }
    } catch {
      return "Enter a valid link starting with https://";
    }
  }
  return null;
}

const STEP_LABELS = ["Business", "Details", "Verify"];

export default function RegisterPage() {
  const { signUp, getToken } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    businessName: "",
    email: "",
    password: "",
    phone: "",
    category: VENDOR_CATEGORIES[0],
    address: "",
    verificationDocUrl: "",
  });

  const update = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const next = () => {
    const message = validateStep(step, form);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, 3));
  };

  const back = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleFinalSubmit = async () => {
    setError(null);

    for (const s of [1, 2, 3]) {
      const message = validateStep(s, form);
      if (message) {
        setStep(s);
        setError(message);
        return;
      }
    }

    setSubmitting(true);
    let createdUser: User | null = null;
    try {
      // 1. Create the Firebase auth account
      createdUser = await signUp(form.email.trim(), form.password);

      // 2. Create the vendor profile in MongoDB (gives up after 20s instead
      // of hanging forever)
      const token = await getToken();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch("/api/vendor/register", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            businessName: form.businessName.trim(),
            category: form.category,
            phone: form.phone,
            address: form.address.trim(),
            verificationDocUrl: form.verificationDocUrl.trim() || undefined,
          }),
        });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Registration failed");
      }

      // New vendors always start unapproved, so go to the status page.
      router.replace("/pending");
    } catch (err) {
      // If the profile couldn't be saved, remove the Firebase account so the
      // vendor can retry with the same email instead of getting stuck.
      if (createdUser) {
        await createdUser.delete().catch(() => {});
      }
      // `code` is not always a string (an AbortError's code is the number 20),
      // so only treat it as an auth code when it really is one.
      const errInfo = err as { code?: unknown; name?: string } | null;
      const code = typeof errInfo?.code === "string" ? errInfo.code : "";
      if (code.startsWith("auth/")) setStep(1);

      const timedOut = errInfo?.name === "AbortError";
      setError(
        timedOut
          ? "The server took too long to respond. Check your connection and try again."
          : friendlyAuthError(err)
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-muted px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-1 text-center">
          <h1 className="text-2xl font-bold text-ink">Create Your Store</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Let&apos;s get your business on Crafteey!
          </p>
        </div>

        <StepIndicator step={step} />

        {error && (
          <p className="mt-4 rounded-lg bg-status-danger-bg p-2 text-sm text-status-danger">
            {error}
          </p>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-bold text-ink">Business & account info</h2>
            <Field label="Business name">
              <input
                className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
                value={form.businessName}
                onChange={(e) => update("businessName", e.target.value)}
              />
            </Field>
            <Field label="Category">
              <select
                className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              >
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Email">
              <input
                type="email"
                className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
            </Field>
            <button
              onClick={next}
              className="w-full rounded-xl bg-brand py-3 font-semibold text-brand-ink"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-bold text-ink">Store location</h2>
            <Field label="Phone number">
              <input
                className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </Field>
            <Field label="Store address">
              <textarea
                className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
                rows={3}
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
              />
            </Field>
            <div className="flex gap-3">
              <button
                onClick={back}
                className="flex-1 rounded-xl border border-surface-border py-3 font-semibold text-ink"
              >
                Back
              </button>
              <button
                onClick={next}
                className="flex-1 rounded-xl bg-brand py-3 font-semibold text-brand-ink"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-bold text-ink">Verification</h2>
            <p className="text-sm text-ink-muted">
              Upload your CAC document or a valid ID. This is used by our
              team to approve your store — you&apos;ll be notified once
              approved.
            </p>
            {/* TODO: wire this input to a signed Cloudinary upload, same
                pattern as crafteey-client's photo/video upload, then set
                form.verificationDocUrl to the returned secure_url */}
            <Field label="Verification document URL (temporary manual field)">
              <input
                className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-ink outline-none focus:border-brand"
                placeholder="https://..."
                value={form.verificationDocUrl}
                onChange={(e) => update("verificationDocUrl", e.target.value)}
              />
            </Field>
            <div className="flex gap-3">
              <button
                onClick={back}
                className="flex-1 rounded-xl border border-surface-border py-3 font-semibold text-ink"
              >
                Back
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="flex-1 rounded-xl bg-brand py-3 font-semibold text-brand-ink disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit for review"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="mt-6 flex items-start justify-between">
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = num < step;
        const active = num === step;
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div
                  className={`h-0.5 flex-1 ${
                    num <= step ? "bg-brand" : "bg-surface-border"
                  }`}
                />
              )}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done || active
                    ? "bg-brand text-brand-ink"
                    : "bg-surface-border text-ink-faint"
                }`}
              >
                {num}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 ${
                    num < step ? "bg-brand" : "bg-surface-border"
                  }`}
                />
              )}
            </div>
            <span
              className={`mt-1.5 text-xs font-medium ${
                active ? "text-ink" : "text-ink-faint"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}