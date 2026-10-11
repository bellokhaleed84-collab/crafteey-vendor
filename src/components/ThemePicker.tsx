"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Smartphone, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  DEFAULT_THEME,
  getStoredTheme,
  saveTheme,
  type ThemeChoice,
} from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; hint: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", hint: "Bright background", icon: Sun },
  { value: "dark", label: "Dark", hint: "Easier on the eyes at night", icon: Moon },
  { value: "auto", label: "Auto", hint: "Match my phone's setting", icon: Smartphone },
];

export default function ThemePicker() {
  const [choice, setChoice] = useState<ThemeChoice>(DEFAULT_THEME);

  useEffect(() => {
    setChoice(getStoredTheme());
  }, []);

  const pick = (value: ThemeChoice) => {
    setChoice(value);
    saveTheme(value);
  };

  return (
    <Card className="divide-y divide-surface-border">
      {OPTIONS.map(({ value, label, hint, icon: Icon }) => {
        const selected = choice === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => pick(value)}
            aria-pressed={selected}
            className="flex min-h-16 w-full items-center gap-3 p-4 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <Icon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{label}</p>
              <p className="text-xs text-ink-muted">{hint}</p>
            </div>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                selected
                  ? "bg-brand text-brand-ink"
                  : "border-2 border-surface-border text-transparent"
              }`}
            >
              <Check size={14} strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </Card>
  );
}