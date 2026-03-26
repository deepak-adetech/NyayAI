"use client";

import { useTranslation } from "@/i18n/useTranslation";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "hi" : "en")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
      title={locale === "en" ? "Switch to Hindi" : "Switch to English"}
    >
      <span className={locale === "en" ? "font-bold" : "opacity-50"}>EN</span>
      <span className="text-gray-300">/</span>
      <span className={locale === "hi" ? "font-bold" : "opacity-50"}>हिं</span>
    </button>
  );
}
