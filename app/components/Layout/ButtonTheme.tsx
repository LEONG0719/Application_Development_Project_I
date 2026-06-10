"use client";

import { useEffect, useState } from "react";

import Icon from "@/app/components/Icon/Icon";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "quarter-management-theme";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The selected theme still applies for this session when storage is blocked.
  }
}

export default function ButtonTheme() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let storedTheme: ThemeMode = "light";

    try {
      storedTheme =
        localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch {
      storedTheme = "light";
    }

    applyTheme(storedTheme);
    setTheme(storedTheme);
    setMounted(true);

    function handleStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      const nextTheme = event.newValue === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
      setTheme(nextTheme);
    }

    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function handleToggle() {
    const nextTheme = theme === "light" ? "dark" : "light";

    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  const isDark = theme === "dark";
  const label = isDark ? "Gunakan mod cerah" : "Gunakan mod gelap";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      onClick={handleToggle}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-all duration-200 ${
        isDark
          ? "border-dark-blue bg-dark-blue"
          : "border-light-grey/30 bg-light-blue"
      } ${mounted ? "opacity-100" : "opacity-0"} hover:scale-[0.98] active:scale-[0.92]`}
    >
      <span
        className={`absolute grid h-6 w-6 place-items-center rounded-full shadow-sm transition-transform duration-200 ${
          isDark
            ? "translate-x-7 bg-static-white text-static-dark"
            : "translate-x-1 bg-dark-blue text-static-white"
        }`}
      >
        <Icon icon={isDark ? "dark_mode" : "light_mode"} size={15} filled />
      </span>
    </button>
  );
}
