"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, LocateFixed } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, readError } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LocationPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(getToken, "/api/vendor/location");
        if (res.ok) {
          const d = await res.json();
          setAddress(d.address ?? "");
          if (typeof d.lat === "number" && typeof d.lng === "number") {
            setCoords({ lat: d.lat, lng: d.lng });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  const save = async (payload: Record<string, unknown>) => {
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const res = await apiFetch(getToken, "/api/vendor/location", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readError(res, "Couldn't save your location."));
      const d = await res.json();
      setAddress(d.address ?? address);
      setCoords({ lat: d.lat, lng: d.lng });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your location.");
    } finally {
      setBusy(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setError("This device can't share its location.");
    setError(null);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        save({ address: address.trim() || undefined, lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setBusy(false);
        setError("Couldn't get your location. Allow location access and try again.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="max-w-lg space-y-5">
      <button onClick={() => router.back()} aria-label="Back" className="inline-flex items-center gap-2 text-ink">
        <ChevronLeft size={22} />
        <span className="text-lg font-bold">Store Location</span>
      </button>

      <p className="text-sm text-ink-muted">
        Customers&apos; delivery fees are calculated from this point, so it should be exactly where riders
        will pick up.
      </p>

      {error && (
        <p className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger">{error}</p>
      )}
      {saved && (
        <p className="rounded-xl bg-status-success-bg p-3 text-sm font-medium text-status-success">Location saved.</p>
      )}

      <Card className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <MapPin size={16} /> Current pin
        </div>
        {loading ? (
          <Skeleton className="h-4 w-56" />
        ) : coords ? (
          <a
            href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-brand-dark underline"
          >
            View on map ({coords.lat.toFixed(5)}, {coords.lng.toFixed(5)})
          </a>
        ) : (
          <p className="text-sm text-status-danger">Not set yet. Customers can&apos;t order until you set it.</p>
        )}
      </Card>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink">Store address</label>
        <textarea
          rows={3}
          placeholder="e.g. 12 Allen Avenue, Ikeja, Lagos"
          className="w-full rounded-xl border border-surface-border bg-white px-4 py-3.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <button
        onClick={() => save({ address })}
        disabled={busy || !address.trim()}
        className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-brand-ink disabled:opacity-60"
      >
        {busy ? "Saving..." : "Save from address"}
      </button>

      <button
        onClick={useMyLocation}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-surface-border bg-white py-3.5 text-sm font-semibold text-ink disabled:opacity-60"
      >
        <LocateFixed size={18} /> Use my current location
      </button>
      <p className="text-xs text-ink-faint">
        Tap this while you&apos;re at the store for the most accurate pin.
      </p>
    </div>
  );
}