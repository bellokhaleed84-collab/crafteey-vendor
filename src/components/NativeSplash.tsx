"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

const BG = "#2A025E";
const SEEN_KEY = "crafteey-splash-seen";
const EXIT_AT = 1900; // ms after the logo is on screen
const REMOVE_AT = 2450;

const CSS = `
@keyframes cfGlow{0%{opacity:0;transform:scale(.85)}50%{opacity:1}100%{opacity:.6;transform:scale(1.05)}}
@keyframes cfSweep{from{background-position:100% 0}to{background-position:0% 0}}
@media (prefers-reduced-motion: reduce){.cf-anim{animation:none !important}}
`;

// Shown once per app launch, inside the Android app only. It picks up exactly
// where the still purple screen stops, so there is no visible jump.
export default function NativeSplash() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      if (window.sessionStorage.getItem(SEEN_KEY)) {
        SplashScreen.hide().catch(() => {});
        return;
      }
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // storage blocked: just show it
    }
    setShow(true);
  }, []);

  const begin = useCallback(() => {
    if (started.current) return;
    started.current = true;
    SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => {});
    window.setTimeout(() => setLeaving(true), EXIT_AT);
    window.setTimeout(() => setShow(false), REMOVE_AT);
  }, []);

  useEffect(() => {
    if (!show) return;
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) begin();
    const safety = window.setTimeout(begin, 1500);
    return () => window.clearTimeout(safety);
  }, [show, begin]);

  if (!show) return null;

  const box = "min(100vw, 520px)";
  const glow = "min(140vw, 760px)";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: BG,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transition: "opacity 450ms ease-out",
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <style>{CSS}</style>

      <div
        className="cf-anim"
        style={{
          position: "absolute",
          width: glow,
          height: glow,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,200,0,0.26) 0%, rgba(255,200,0,0) 62%)",
          animation: "cfGlow 1.6s ease-out .2s both",
        }}
      />

      <div
        style={{
          position: "relative",
          width: box,
          transform: leaving ? "scale(1.12)" : "scale(1)",
          transition: "transform 450ms ease-out",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src="/splash-logo.png"
          alt=""
          onLoad={begin}
          onError={begin}
          style={{ display: "block", width: "100%", height: "auto" }}
        />
        <div
          className="cf-anim"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            WebkitMaskImage: "url(/splash-logo.png)",
            maskImage: "url(/splash-logo.png)",
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            backgroundImage:
              "linear-gradient(115deg, rgba(255,226,140,0) 40%, rgba(255,226,140,0.6) 50%, rgba(255,226,140,0) 60%)",
            backgroundSize: "300% 100%",
            backgroundPosition: "100% 0",
            animation: "cfSweep 1.1s ease-in-out .4s both",
          }}
        />
      </div>
    </div>
  );
}