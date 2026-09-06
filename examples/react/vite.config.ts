import tailwindcss from "@tailwindcss/vite";
import { trekPlugin } from "@trekscripts/ui/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), trekPlugin()],
  css: {
    // FiveM NUI CEF is Chromium M103 (103.0.5060.141). Modern CSS (oklch, color-mix needs 111, :has needs 105) breaks without transpilation.
    transformer: "lightningcss",
    lightningcss: {
      // 103 ensures oklch→rgb, color-mix→fallback, hsl slash→rgba. :has has no polyfill — avoid it in components.
      targets: {
        chrome: 103 << 16,
      },
      drafts: {
        customMedia: true,
      },
      nonStandard: {
        deepSelectorCombinator: true,
      },
      // lightningcss polyfills nesting even without explicit flag for tailwind
      cssModules: false,
    },
  },
  build: {
    rolldownOptions: { treeshake: true },
    outDir: "../ui",
    target: "chrome103",
    cssTarget: "chrome103",
    cssMinify: "lightningcss",
  },
  // for WSL HMR
  server: {
    watch: {
      usePolling: true,
    },
  },
});
