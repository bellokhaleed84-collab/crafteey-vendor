export const CATEGORY_LABELS: Record<string, string> = {
  payment: "Payments or payouts",
  order: "An order",
  app: "App not working",
  account: "My account",
  other: "Something else",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  fixed: "Fixed",
};

// Full class names so Tailwind always generates them.
export const STATUS_STYLE: Record<string, string> = {
  open: "bg-status-new-bg text-status-new",
  in_progress: "bg-status-preparing-bg text-status-preparing",
  fixed: "bg-status-delivered-bg text-status-delivered",
};