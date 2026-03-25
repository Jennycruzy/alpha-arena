/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        arena: {
          bg: "#07080A",
          surface: "#0D0F14",
          border: "#1A1E2A",
          accent: "#00F0FF",
          gold: "#FFD700",
          red: "#FF3B5C",
          green: "#00E676",
          purple: "#A855F7",
          muted: "#5A6178",
        },
      },
      fontFamily: {
        display: ['"Clash Display"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        body: ['"General Sans"', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "slide-up": "slideUp 0.5s ease-out",
        "fade-in": "fadeIn 0.4s ease-out",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0,240,255,0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(0,240,255,0.35)" },
        },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: 0 },
          to: { transform: "translateY(0)", opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
