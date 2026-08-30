import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "vite-plugin/index": "src/vite-plugin/index.ts",
  },
  format: "esm",
  dts: true,
  clean: true,
  deps: { neverBundle: ["react", "react-dom", "vite"] },
});
