/**
 * Rajyash Food-Rescue — Tailwind CSS v3 config (fallback).
 * For Tailwind v4, prefer tokens/globals.css (@theme inline) instead.
 *
 * This config maps the CSS variables defined in globals.css ( :root / .dark )
 * to Tailwind color/radius/font utilities. You STILL need the :root and .dark
 * variable blocks from globals.css for these to resolve.
 *
 * Note: colors are wired as raw `var(--x)` (hex), so Tailwind opacity
 * modifiers like `bg-primary/50` won't work. If you need those, convert the
 * variables to HSL channel triplets and wrap with hsl(var(--x) / <alpha-value>).
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: { DEFAULT: "var(--surface)", 2: "var(--surface-2)" },
        card: { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        popover: { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
          "soft-foreground": "var(--primary-soft-foreground)",
        },
        saffron: "var(--saffron)",
        leaf: {
          DEFAULT: "var(--leaf)",
          foreground: "var(--leaf-foreground)",
          hover: "var(--leaf-hover)",
          soft: "var(--leaf-soft)",
          "soft-foreground": "var(--leaf-soft-foreground)",
          bright: "var(--leaf-bright)",
        },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        success: { DEFAULT: "var(--success)", foreground: "var(--success-foreground)", soft: "var(--success-soft)", "soft-foreground": "var(--success-soft-foreground)" },
        warning: { DEFAULT: "var(--warning)", foreground: "var(--warning-foreground)", soft: "var(--warning-soft)", "soft-foreground": "var(--warning-soft-foreground)" },
        destructive: { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)", soft: "var(--destructive-soft)", "soft-foreground": "var(--destructive-soft-foreground)" },
        info: { DEFAULT: "var(--info)", foreground: "var(--info-foreground)", soft: "var(--info-soft)", "soft-foreground": "var(--info-soft-foreground)" },
        border: { DEFAULT: "var(--border)", strong: "var(--border-strong)" },
        input: "var(--input)",
        ring: "var(--ring)",
        // Pickup status pills — use as bg-status-enroute-bg text-status-enroute-fg, etc.
        status: {
          "requested-bg": "var(--st-requested-bg)", "requested-fg": "var(--st-requested-fg)", "requested-dot": "var(--st-requested-dot)",
          "accepted-bg": "var(--st-accepted-bg)", "accepted-fg": "var(--st-accepted-fg)", "accepted-dot": "var(--st-accepted-dot)",
          "enroute-bg": "var(--st-enroute-bg)", "enroute-fg": "var(--st-enroute-fg)", "enroute-dot": "var(--st-enroute-dot)",
          "pickedup-bg": "var(--st-pickedup-bg)", "pickedup-fg": "var(--st-pickedup-fg)", "pickedup-dot": "var(--st-pickedup-dot)",
          "delivered-bg": "var(--st-delivered-bg)", "delivered-fg": "var(--st-delivered-fg)", "delivered-dot": "var(--st-delivered-dot)",
          "cancelled-bg": "var(--st-cancelled-bg)", "cancelled-fg": "var(--st-cancelled-fg)", "cancelled-dot": "var(--st-cancelled-dot)",
        },
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
      },
      fontFamily: {
        display: ["Bricolage Grotesque", "Mukta", "system-ui", "sans-serif"],
        sans: ["Mukta", "Noto Sans Devanagari", "Noto Sans Gujarati", "system-ui", "sans-serif"],
      },
      boxShadow: {
        sm: "0 1px 2px rgba(50,38,20,.06), 0 1px 1px rgba(50,38,20,.04)",
        md: "0 4px 14px rgba(50,38,20,.08), 0 1px 3px rgba(50,38,20,.05)",
        lg: "0 14px 38px rgba(50,38,20,.13), 0 3px 8px rgba(50,38,20,.06)",
      },
    },
  },
  plugins: [],
};
