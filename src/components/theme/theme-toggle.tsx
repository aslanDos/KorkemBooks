"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { LanguageToggle } from "@/components/locale/locale-provider";

type Theme = "light" | "dark";

const THEME_CHANGE_EVENT = "shambooks-theme-change";

function getThemeSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "light");

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("shambooks-theme", nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  const nextThemeLabel = theme === "light" ? "Включить тёмную тему" : "Включить светлую тему";

  return (
    <div className="theme-controls"><LanguageToggle /><button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={nextThemeLabel}
      title={nextThemeLabel}
    >
      {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
    </button></div>
  );
}
