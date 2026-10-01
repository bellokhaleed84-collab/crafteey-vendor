export type StaffAccess =
  | { kind: "staff"; storeName: string }
  | { kind: "needs_verification" }
  | { kind: "none" };

/** Is this signed-in person staff at a store? Also activates a matching invite. */
export async function fetchMyStaffAccess(token: string): Promise<StaffAccess> {
  const res = await fetch("/api/staff/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.ok) {
    const data = await res.json().catch(() => null);
    if (data?.role === "staff") {
      return { kind: "staff", storeName: data.store?.name ?? "your store" };
    }
    return { kind: "none" };
  }

  if (res.status === 403) {
    const data = await res.json().catch(() => null);
    if (data?.needsEmailVerification) return { kind: "needs_verification" };
    return { kind: "none" };
  }
  if (res.status === 404) return { kind: "none" };

  throw new Error("Couldn't verify your account.");
}