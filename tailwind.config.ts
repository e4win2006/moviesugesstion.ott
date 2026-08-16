import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: { ink: "#07090d", panel: "#101318", lime: "#d6ff3f" },
      boxShadow: { glow: "0 0 40px rgba(214,255,63,.12)" },
    },
  },
  plugins: [],
} satisfies Config;
