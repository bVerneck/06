import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "taskflow-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 transition-transform" />
      ) : (
        <Moon className="h-4 w-4 transition-transform" />
      )}
    </Button>
  );
}
