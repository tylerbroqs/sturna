/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070907",
          900: "#0A0D09",
          850: "#0E120C",
          800: "#12160F",
          700: "#1A1F16",
          600: "#252C1E",
        },
        // primary brand accent = logo lime. Kept under the `mint` key so the
        // existing accent classes across the app recolor with zero churn.
        mint: {
          400: "#C4F03A",
          500: "#A8E020",
          600: "#8FB82E",
        },
        // secondary terminal/Monokai accents
        iris: { 400: "#66D9EF", 500: "#4CC7E0" },
        grape: { 400: "#AE81FF" },
        brand: { DEFAULT: "#C4F03A", bright: "#D4FF4A", dim: "#8FB82E" },
      },
      fontFamily: {
        sans: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(196,240,58,0.16), 0 20px 60px -20px rgba(196,240,58,0.25)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 50px -30px rgba(0,0,0,0.9)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        pulseRing: { "0%": { transform: "scale(0.9)", opacity: "0.7" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
        blink: { "0%,49%": { opacity: "1" }, "50%,100%": { opacity: "0" } },
        scan: { "0%": { transform: "translateY(-100%)" }, "100%": { transform: "translateY(100%)" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseRing: "pulseRing 2.4s ease-out infinite",
        blink: "blink 1.1s step-end infinite",
      },
    },
  },
  plugins: [],
};
