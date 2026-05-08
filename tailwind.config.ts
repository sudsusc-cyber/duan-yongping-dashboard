import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          0: "#0c0c10",
          paper: "#14141a",
          raised: "#1c1c24",
        },
        bone: {
          100: "#f5f1e8",
          200: "#c5beae",
          300: "#8a8378",
          400: "#5a5450",
          500: "#38342f",
        },
        gold: {
          deep: "#6b5a32",
          DEFAULT: "#c9a961",
          light: "#e4cc92",
        },
        rise: "#c0392b",
        fall: "#4a8770",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"Noto Serif SC"', "serif"],
        serifCn: ['"Noto Serif SC"', "serif"],
        quote: ["Newsreader", "serif"],
        sc: ['"Cormorant SC"', "serif"],
        sans: ['"Plus Jakarta Sans"', '"Noto Sans SC"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        cn: "0.30em",
        cnWide: "0.42em",
        seal: "0.55em",
      },
    },
  },
  plugins: [],
};
export default config;
