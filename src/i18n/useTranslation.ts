"use client";

import { useCallback } from "react";
import type { Locale } from "./config";
import { useLanguage } from "@/store/language";
import en from "./messages/en.json";
import hi from "./messages/hi.json";

const messages: Record<Locale, Record<string, unknown>> = { en, hi };

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Fallback: return the key itself
    }
  }
  return typeof current === "string" ? current : path;
}

export function useTranslation() {
  const language = useLanguage((s) => s.language);
  const setLanguage = useLanguage((s) => s.setLanguage);

  const locale: Locale = language;

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLanguage(newLocale);
    },
    [setLanguage],
  );

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(messages[locale], key);
    },
    [locale],
  );

  return { t, locale, setLocale };
}

/**
 * Get the current locale from the zustand store (for use in non-hook contexts)
 */
export function getStoredLocale(): Locale {
  return useLanguage.getState().language;
}
