/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 极光主色谱：从极光绿 → 青 → 蓝 → 靛 → 紫，一条完整的北极光光带。
        // 组件里用 aurora-* 取色，集中维护，避免散落的 cyan/sky 硬编码。
        aurora: {
          green: "#34f0a8",
          teal: "#2dd4bf",
          cyan: "#22d3ee",
          blue: "#38bdf8",
          indigo: "#818cf8",
          violet: "#a78bfa",
        },
        // 夜空底色：带一点靛紫倾向的近黑，作为极光铺陈的背景。
        night: {
          950: "#05060f",
          900: "#080a1a",
          850: "#0b0e22",
          800: "#11142e",
        },
      },
      boxShadow: {
        aurora: "0 18px 50px rgba(52,240,168,0.28)",
        "aurora-soft": "0 12px 35px rgba(45,212,191,0.22)",
      },
      keyframes: {
        // 背景极光缓慢漂移：位移 + 透明度轻微起伏，营造流动的北极光。
        "aurora-drift": {
          "0%, 100%": {
            transform: "translate3d(-4%, -2%, 0) scale(1.05)",
            opacity: "0.85",
          },
          "50%": {
            transform: "translate3d(4%, 3%, 0) scale(1.12)",
            opacity: "1",
          },
        },
      },
      animation: {
        "aurora-drift": "aurora-drift 22s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
