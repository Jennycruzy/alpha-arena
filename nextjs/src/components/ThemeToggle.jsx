"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="fixed top-6 right-6 md:top-8 md:right-8 z-50 p-3 rounded-full glass-card hover:scale-110 transition-transform cursor-pointer"
            aria-label="Toggle Dark Mode"
            style={{ border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,102,255,0.3)'}` }}
        >
            {theme === "dark" ? <Sun size={20} className="text-[#FACC15]" /> : <Moon size={20} className="text-[#0066FF]" />}
        </button>
    );
}
