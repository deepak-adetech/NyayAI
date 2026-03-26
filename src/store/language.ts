import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LanguageStore {
  language: "en" | "hi";
  setLanguage: (lang: "en" | "hi") => void;
  t: (en: string, hi: string) => string;
}

export const useLanguage = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
      t: (en, hi) => (get().language === "hi" ? hi : en),
    }),
    { name: "nyaya-lang" },
  ),
);
