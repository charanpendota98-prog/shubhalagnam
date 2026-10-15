const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: "#7A0C2E",
          dark: "#5C0822",
          light: "#A0143A",
          soft: "#F9EDF1",
        },
        gold: {
          DEFAULT: "#D4AF37",
          light: "#F0D68C",
          soft: "#FFF6DC",
          deep: "#B8912A",
        },
        cream: {
          DEFAULT: "#FFF8E7",
          deep: "#F7EED8",
        },
        navy: {
          DEFAULT: "#0F1F3C",
          light: "#1E3A5F",
        },
        peacock: {
          DEFAULT: "#0F766E",
          dark: "#075E54",
          soft: "#E6F4F1",
        },
        ink: "#1A1A1A",
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "-apple-system", "sans-serif"],
        telugu: ["'Noto Sans Telugu'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        brand: "0 10px 40px rgba(122, 12, 46, 0.15)",
        brandLg: "0 20px 60px rgba(122, 12, 46, 0.22)",
        gold: "0 8px 30px rgba(212, 175, 55, 0.35)",
        soft: "0 4px 20px rgba(15, 31, 60, 0.08)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.4)",
      },
      borderRadius: {
        brand: "1.5rem",
        pill: "999px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        maroon: "linear-gradient(135deg, #7A0C2E 0%, #A0143A 100%)",
        gold: "linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%)",
        navy: "linear-gradient(135deg, #0F1F3C 0%, #1E3A5F 100%)",
        cream: "linear-gradient(180deg, #FFF8E7 0%, #F7EED8 100%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-500px 0" },
          "100%": { backgroundPosition: "500px 0" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(212,175,55,0.55)" },
          "70%": { boxShadow: "0 0 0 14px rgba(212,175,55,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(212,175,55,0)" },
        },
        tickerScroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        fadeUp: "fadeUp 0.6s ease-out both",
        shimmer: "shimmer 1.6s linear infinite",
        pulseRing: "pulseRing 2s infinite",
        ticker: "tickerScroll 28s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
