/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-panel": "var(--bg-panel)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-hover": "var(--bg-hover)",
        border: {
          DEFAULT: "var(--border)",
          soft: "var(--border-soft)",
          strong: "var(--border-strong)",
        },
        text: {
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
          dim: "var(--text-dim)",
        },
        accent: {
          fill: "var(--fill-accent)",
          text: "var(--text-accent)",
          border: "var(--border-accent)",
          bg: "var(--bg-accent)",
          on: "var(--on-accent)",
        },
        stage: {
          upload: "var(--stage-upload)",
          parse: "var(--stage-parse)",
          clean: "var(--stage-clean)",
          chunk: "var(--stage-chunk)",
          embed: "var(--stage-embed)",
          retrieve: "var(--stage-retrieve)",
          prompt: "var(--stage-prompt)",
          generate: "var(--stage-generate)",
          evaluate: "var(--stage-evaluate)",
        },
        surface: {
          0: "var(--bg)",
          1: "var(--bg-elevated)",
          2: "var(--bg-panel)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
    },
  },
  plugins: [],
};
