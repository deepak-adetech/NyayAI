export type Locale = "en" | "hi";

export const defaultLocale: Locale = "en";
export const locales: Locale[] = ["en", "hi"];

export const localeNames: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
};
