// Approval is a manual true/false switch (isApproved) until the admin
// screen exists. A rejected or suspended status always overrides it.
//
// NEXT_PUBLIC_REQUIRE_VENDOR_APPROVAL lets you bypass the approval gate
// everywhere at once (login, /pending, VendorGuard, and the isOpen check
// in api/vendor/me) without touching any of that logic. Defaults to
// requiring approval — set it to "false" in .env.local to bypass, and
// remove it (or set "true") to restore the real gate.
const REQUIRE_VENDOR_APPROVAL =
  process.env.NEXT_PUBLIC_REQUIRE_VENDOR_APPROVAL !== "false";

export function isVendorApproved(v: { isApproved?: boolean; status?: string }): boolean {
  if (v.status === "rejected" || v.status === "suspended") return false;
  if (!REQUIRE_VENDOR_APPROVAL) return true;
  return v.isApproved === true;
}