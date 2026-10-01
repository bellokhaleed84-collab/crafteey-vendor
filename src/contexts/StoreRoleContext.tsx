"use client";

import { createContext, useContext } from "react";

export type StoreRole = "owner" | "staff";

export interface StoreAccessValue {
  role: StoreRole;
  /** Set for staff: the store they work at. */
  storeName: string | null;
}

const StoreAccessContext = createContext<StoreAccessValue>({ role: "owner", storeName: null });

export const StoreAccessProvider = StoreAccessContext.Provider;

export function useStoreAccess(): StoreAccessValue {
  return useContext(StoreAccessContext);
}