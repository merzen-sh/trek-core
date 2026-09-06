import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
    },
    unbundle: true,
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    deps: { neverBundle: ["react", "react-dom"] },
    platform: "browser",
  },
  {
    // Vite plugin runs in Node (vite.config.ts), not the browser.
    // Must ship as plain JS: Node >=22 refuses to type-strip TS
    // files under node_modules (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING).
    entry: {
      "vite-plugin": "src/vite-plugin/index.ts",
    },
    format: ["esm"],
    dts: true,
    clean: false,
    platform: "node",
    fixedExtension: false,
  },
]);
