/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "tertiary-fixed": "#bce9ff", "primary-fixed-dim": "#e8c351", "outline-variant": "#d0c5b0", outline: "#7e7664", "surface-container-highest": "#e9e1d5", "surface-container-low": "#fbf3e5", "on-secondary-fixed-variant": "#53451c", "surface-container-lowest": "#ffffff", "inverse-primary": "#e8c351", primary: "#745c00", "surface-container": "#f5ede0", "surface-container-high": "#efe7da", "surface-tint": "#745c00", "on-surface": "#1e1b14", "on-secondary-container": "#716135", "on-background": "#1e1b14", "on-tertiary-container": "#00617d", tertiary: "#006783", "on-secondary": "#ffffff", "on-primary-fixed-variant": "#574500", "on-surface-variant": "#4d4636", "inverse-on-surface": "#f8f0e3", "on-tertiary-fixed-variant": "#004d63", "on-tertiary-fixed": "#001f2a", error: "#ba1a1a", "on-tertiary": "#ffffff", "primary-container": "#f4ce5b", "on-primary": "#ffffff", "tertiary-container": "#8bdcff", "on-error": "#ffffff", background: "#fff8f0", surface: "#fff8f0", "inverse-surface": "#343027", "secondary-fixed-dim": "#d9c590", "primary-fixed": "#ffe089", "error-container": "#ffdad6", "on-primary-container": "#6e5700", "on-secondary-fixed": "#241a00", "surface-dim": "#e1d9cc", "surface-bright": "#fff8f0", "on-error-container": "#93000a", "secondary-fixed": "#f6e1aa", secondary: "#6c5d31", "on-primary-fixed": "#241a00", "surface-variant": "#e9e1d5", "secondary-container": "#f3dea7", "tertiary-fixed-dim": "#80d1f4"
      },
      borderRadius: {DEFAULT: "0.125rem", lg: "0.25rem", xl: "0.5rem", full: "0.75rem"},
      spacing: {"widget-gap": "8px", "panel-padding": "12px", gutter: "12px", unit: "4px", "margin-edge": "16px"},
      fontFamily: {"headline-sm": ["Inter", "sans-serif"], "label-caps": ["Inter", "sans-serif"], "display-telemetry": ["JetBrains Mono", "monospace"], "data-tabular": ["JetBrains Mono", "monospace"], "body-md": ["Inter", "sans-serif"], headline: ["Inter", "sans-serif"], display: ["Inter", "sans-serif"], body: ["Inter", "sans-serif"], label: ["JetBrains Mono", "monospace"]},
      fontSize: {"headline-sm": ["18px", {lineHeight: "24px", letterSpacing: "0.02em", fontWeight: "600"}], "label-caps": ["10px", {lineHeight: "12px", letterSpacing: "0.08em", fontWeight: "700"}], "display-telemetry": ["24px", {lineHeight: "32px", letterSpacing: "-0.02em", fontWeight: "700"}], "data-tabular": ["12px", {lineHeight: "16px", fontWeight: "500"}], "body-md": ["14px", {lineHeight: "20px", fontWeight: "400"}]}
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ],
}
