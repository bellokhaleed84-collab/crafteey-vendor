"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyVendor, routeForVendor } from "@/lib/vendorApi";

export default function SplashPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const routed = useRef(false);

  useEffect(() => {
    if (loading || routed.current) return;

    if (!user) {
      routed.current = true;
      router.replace("/login");
      return;
    }

    routed.current = true;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          router.replace("/login");
          return;
        }
        const vendor = await fetchMyVendor(token);
        router.replace(vendor ? routeForVendor(vendor) : "/login");
      } catch {
        router.replace("/login");
      }
    })();
  }, [loading, user, getToken, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy px-6">
      <div className="flex flex-col items-center gap-5">
        <div className="flex h-28 w-28 items-center justify-center rounded-[32px] bg-white text-6xl font-black text-navy">
          C
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">crafteey</h1>
          <p className="mt-1 text-xl font-light tracking-wide text-white/90">vendors</p>
        </div>
      </div>
      <p className="absolute bottom-16 text-xs text-white/50">Powering great local businesses</p>
    </main>
  );
}