import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    query: "src/query/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  deps: { neverBundle: ["react", "react-dom"] },
  platform: "browser",
});
