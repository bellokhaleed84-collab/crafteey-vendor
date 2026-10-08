import { randomBytes } from "crypto";

// Options a vendor sets on a food or drink: portions, extras like beef, toppings.
// Stored in kobo. The vendor pages talk in naira and convert here.

export interface StoredChoice {
  id: string;
  name: string;
  priceKobo: number;
  imageUrl?: string;
  maxQty: number;
}

export interface StoredGroup {
  id: string;
  name: string;
  required: boolean;
  single: boolean;
  choices: StoredChoice[];
}

type ParseResult = { ok: true; value: StoredGroup[] } | { ok: false; error: string };

const MAX_GROUPS = 10;
const MAX_CHOICES = 30;
const MAX_QTY_PER_CHOICE = 20;
const MAX_PRICE_NAIRA = 10000000;
const ID_RE = /^[A-Za-z0-9_-]{4,40}$/;

function freshId(used: Set<string>): string {
  let id = "";
  do {
    id = randomBytes(6).toString("hex");
  } while (used.has(id));
  used.add(id);
  return id;
}

function takeId(raw: unknown, used: Set<string>): string {
  if (typeof raw === "string" && ID_RE.test(raw) && !used.has(raw)) {
    used.add(raw);
    return raw;
  }
  return freshId(used);
}

function bad(error: string): ParseResult {
  return { ok: false, error };
}

/** Checks the option groups sent from the menu form and turns them into what we store. */
export function parseOptionGroups(input: unknown): ParseResult {
  if (input === undefined || input === null) return { ok: true, value: [] };
  if (!Array.isArray(input)) return bad("Invalid options");
  if (input.length > MAX_GROUPS) return bad(`You can add up to ${MAX_GROUPS} option groups on one item.`);

  const used = new Set<string>();
  const out: StoredGroup[] = [];

  for (const rawGroup of input) {
    if (!rawGroup || typeof rawGroup !== "object") return bad("Invalid options");
    const g = rawGroup as Record<string, unknown>;

    const name = typeof g.name === "string" ? g.name.trim().replace(/\s+/g, " ") : "";
    if (!name) return bad("Every option group needs a name, like Portion or Extras.");
    if (name.length > 40) return bad("Option group names must be 40 characters or fewer.");

    const single = g.single === true;
    const required = g.required === true;

    if (!Array.isArray(g.choices) || g.choices.length === 0) {
      return bad(`"${name}" needs at least one choice.`);
    }
    if (g.choices.length > MAX_CHOICES) return bad(`"${name}" can have up to ${MAX_CHOICES} choices.`);

    const choices: StoredChoice[] = [];
    for (const rawChoice of g.choices) {
      if (!rawChoice || typeof rawChoice !== "object") return bad("Invalid options");
      const c = rawChoice as Record<string, unknown>;

      const cname = typeof c.name === "string" ? c.name.trim().replace(/\s+/g, " ") : "";
      if (!cname) return bad(`Every choice in "${name}" needs a name.`);
      if (cname.length > 60) return bad("Choice names must be 60 characters or fewer.");

      const price = typeof c.price === "number" ? c.price : NaN;
      if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE_NAIRA) {
        return bad(`Enter a valid price for "${cname}".`);
      }
      const priceKobo = Math.round(price * 100);

      const imageUrl = typeof c.imageUrl === "string" ? c.imageUrl.trim() : "";
      if (imageUrl && (!imageUrl.startsWith("https://") || imageUrl.length > 500)) {
        return bad(`The photo for "${cname}" is not valid.`);
      }

      let maxQty = 1;
      if (!single) {
        const n = typeof c.maxQty === "number" ? c.maxQty : 1;
        if (!Number.isInteger(n) || n < 1 || n > MAX_QTY_PER_CHOICE) {
          return bad(`"${cname}" can allow between 1 and ${MAX_QTY_PER_CHOICE} per plate.`);
        }
        maxQty = n;
      }

      const choice: StoredChoice = { id: takeId(c.id, used), name: cname, priceKobo, maxQty };
      if (imageUrl) choice.imageUrl = imageUrl;
      choices.push(choice);
    }

    out.push({ id: takeId(g.id, used), name, required, single, choices });
  }

  return { ok: true, value: out };
}