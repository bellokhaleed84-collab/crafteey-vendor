import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.crafteey.vendor",
  appName: "Crafteey Vendor",
  webDir: "cap-www",
  server: {
    url: "https://YOUR-VENDOR-APP-URL", // replace with your deployed vendor URL
    cleartext: false,
  },
  plugins: {
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;