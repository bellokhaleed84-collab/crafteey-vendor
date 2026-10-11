import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.crafteey.vendor",
  appName: "Crafteey Vendor",
  webDir: "cap-www",
  backgroundColor: "#2A025E",
  server: {
    url: "https://crafteey-vendor.vercel.app",
    cleartext: false,
  },
  plugins: {
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    SplashScreen: {
      // The animated splash in the app hides this as soon as it is ready.
      // 4000 is only a safety net if the page cannot load (no network).
      launchShowDuration: 4000,
      launchAutoHide: true,
      launchFadeOutDuration: 0,
      backgroundColor: "#2A025E",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;