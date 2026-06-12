"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export default function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2">
        <span aria-label="art" className="text-lg" role="img">
          🎨
        </span>
        <h1 className="font-extrabold font-heading text-base tracking-tight">
          <span className="text-foreground">Voice</span>
          <span className="text-voice-accent">2</span>
          <span className="text-foreground">Art</span>
        </h1>
      </div>
      <Button
        aria-label={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        size="icon"
        variant="ghost"
      >
        {theme === "dark" ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
      </Button>
    </header>
  );
}
