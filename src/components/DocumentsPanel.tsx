"use client";

import { useRef, useState } from "react";
import { Building2, ShieldCheck, FileText, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";

export type DocType = "cac" | "id" | "other";
export type VendorDoc = { id: string; type: DocType; url: string; uploadedAt: string };
export type DocsInfo = {
  documents: VendorDoc[];
  status: string;
  rejectionReason: string;
  resubmittedAt: string | null;
};

const MAX_MB = 10;

const OPTIONS = [
  { key: "cac", label: "CAC certificate", hint: "Your business registration", icon: Building2 },
  { key: "id", label: "ID card", hint: "NIN, driver's licence or passport", icon: ShieldCheck },
  { key: "other", label: "Other document", hint: "Anything else that proves your business", icon: FileText },
] as const;

const LABELS: Record<string, string> = {
  cac: "CAC certificate",
  id: "ID card",
  other: "Other document",
};

function day(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

// Controlled: the page that uses it loads the list and passes it in.
export default function DocumentsPanel({
  documents,
  onChanged,
}: {
  documents: VendorDoc[];
  onChanged: () => void;
}) {
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const chosenType = useRef<DocType>("cac");
  const [busyType, setBusyType] = useState<DocType | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const choose = (type: DocType) => {
    if (busyType) return;
    setError("");
    chosenType.current = type;
    inputRef.current?.click();
  };

  async function handleFile(file: File) {
    const type = chosenType.current;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please take a photo or choose an image (JPG or PNG).");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`The photo must be under ${MAX_MB}MB.`);
      return;
    }

    setBusyType(type);
    try {
      const signRes = await apiFetch(getToken, "/api/upload/sign", {
        method: "POST",
        body: JSON.stringify({ kind: "document" }),
      });
      if (!signRes.ok) throw new Error(await readError(signRes, "Couldn't start the upload."));
      const { cloudName, apiKey, timestamp, signature, folder } = await signRes.json();

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", apiKey);
      form.append("timestamp", String(timestamp));
      form.append("signature", signature);
      form.append("folder", folder);

      const up = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: form,
      });
      const data = await up.json();
      if (!up.ok || !data.secure_url) throw new Error(data?.error?.message || "Upload failed.");

      const save = await apiFetch(getToken, "/api/vendor/documents", {
        method: "POST",
        body: JSON.stringify({ type, url: data.secure_url }),
      });
      if (!save.ok) throw new Error(await readError(save, "Couldn't save your document."));
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusyType(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(d: VendorDoc) {
    if (!window.confirm("Remove this document?")) return;
    setError("");
    setRemovingId(d.id);
    try {
      const res = await apiFetch(getToken, `/api/vendor/documents?id=${d.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "Couldn't remove this document."));
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove this document.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4 text-left">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <div className="space-y-2">
        <p className="text-sm font-bold text-ink">Add a document</p>
        {OPTIONS.map(({ key, label, hint, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => choose(key)}
            disabled={busyType !== null}
            className="flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 border-dashed border-surface-border bg-surface p-3 text-left disabled:opacity-60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{label}</span>
              <span className="block text-xs text-ink-muted">
                {busyType === key ? "Uploading, please wait..." : hint}
              </span>
            </span>
          </button>
        ))}
        <p className="text-xs text-ink-faint">Take a clear photo or pick one from your gallery. Up to {MAX_MB}MB.</p>
      </div>

      {error && <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>}

      {documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-ink">Your documents</p>
          {documents.map((d) => (
            <Card key={d.id} className="flex items-center gap-3 p-3">
              <a href={d.url} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.url} alt="" className="h-14 w-14 rounded-xl border border-surface-border object-cover" />
              </a>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{LABELS[d.type] ?? "Document"}</p>
                <p className="text-xs text-ink-muted">Added {day(d.uploadedAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(d)}
                disabled={removingId === d.id || busyType !== null}
                aria-label="Remove document"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-status-danger disabled:opacity-50"
              >
                <Trash2 size={18} />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}