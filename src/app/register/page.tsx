"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { VENDOR_CATEGORIES } from "@/lib/vendorCategories";
import { friendlyAuthError } from "@/lib/authErrors";
import { VENDOR_TIERS, isVendorTier, type VendorTier } from "@/lib/vendorTiers";
import TierCard from "@/components/TierCard";

type FormState = {
  businessName: string;
  email: string;
  password: string;
  phone: string;
  category: string;
  address: string;
  tier: VendorTier;
};

const REQUEST_TIMEOUT_MS = 20000;
const UPLOAD_TIMEOUT_MS = 30000;
const MAX_LOGO_MB = 5;
const TOTAL_STEPS = 4;
const LOGO_ERROR =
  "We couldn't upload your logo. Try again, or remove it and submit without one.";

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
  if (step === 3) {
    if (!isVendorTier(form.tier)) return "Choose a plan.";
  }
  return null;
}

// Uploads the logo to Cloudinary using a signed request. Must be called AFTER
// the Firebase account exists, because /api/upload/sign requires a token.
async function uploadLogo(
  token: string | null | undefined,
  file: File
): Promise<string> {
  if (!token) throw new Error("Your session expired. Please try again.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const signRes = await fetch("/api/upload/sign", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ kind: "logo" }),
    });
    if (!signRes.ok) throw new Error("sign failed");
    const { cloudName, apiKey, timestamp, signature, folder } = await signRes.json();

    const data = new FormData();
    data.append("file", file);
    data.append("api_key", apiKey);
    data.append("timestamp", String(timestamp));
    data.append("signature", signature);
    data.append("folder", folder);

    const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      signal: controller.signal,
      body: data,
    });
    const json = await up.json();
    if (!up.ok || !json.secure_url) throw new Error("upload failed");
    return json.secure_url as string;
  } catch {
    throw new Error(LOGO_ERROR);
  } finally {
    clearTimeout(timer);
  }
}

const STEP_LABELS = ["Business", "Details", "Plan", "Logo"];

export default function RegisterPage() {
  const { signUp, getToken } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>({
    businessName: "",
    email: "",
    password: "",
    phone: "",
    category: VENDOR_CATEGORIES[0],
    address: "",
    tier: "regular",
  });

  // Free the preview's object URL when it changes or the page unmounts.
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const update = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const pickLogo = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG or PNG).");
      return;
    }
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setError(`Logo must be under ${MAX_LOGO_MB}MB.`);
      return;
    }
    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const next = () => {
    const message = validateStep(step, form);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
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

      const token = await getToken();

      // 2. Upload the logo (needs the token, so it can only happen now)
      let logoUrl: string | undefined;
      if (logoFile) {
        logoUrl = await uploadLogo(token, logoFile);
      }

      // 3. Create the vendor profile in MongoDB (gives up after 20s instead
      // of hanging forever)
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
            tier: form.tier,
            logoUrl,
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
            <h2 className="text-lg font-bold text-ink">Choose your plan</h2>
            <p className="text-sm text-ink-muted">
              The commission is taken from each order&apos;s item total. You can
              ask to change your plan later from Settings.
            </p>
            <div className="space-y-3">
              {VENDOR_TIERS.map((t) => (
                <TierCard
                  key={t}
                  tier={t}
                  selected={form.tier === t}
                  onSelect={() => setForm((prev) => ({ ...prev, tier: t }))}
                />
              ))}
            </div>
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

        {step === 4 && (
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-bold text-ink">Store logo</h2>
            <p className="text-sm text-ink-muted">
              Add your business logo. It will show on your store in the Crafteey
              Hub. Our team reviews your store before it goes live.
            </p>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickLogo(f);
              }}
            />

            <div className="flex flex-col items-center gap-3">
              {logoPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreview}
                    alt="Your store logo"
                    className="h-32 w-32 rounded-2xl border border-surface-border bg-surface object-contain"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={submitting}
                      className="rounded-full border border-surface-border px-4 py-1.5 text-xs font-medium text-ink"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={removeLogo}
                      disabled={submitting}
                      className="rounded-full border border-surface-border px-4 py-1.5 text-xs font-medium text-status-danger"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="flex h-32 w-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-border bg-surface text-sm text-ink-muted"
                >
                  Tap to add logo
                  <span className="mt-1 text-xs text-ink-faint">
                    JPG or PNG, up to {MAX_LOGO_MB}MB
                  </span>
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={back}
                disabled={submitting}
                className="flex-1 rounded-xl border border-surface-border py-3 font-semibold text-ink disabled:opacity-60"
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