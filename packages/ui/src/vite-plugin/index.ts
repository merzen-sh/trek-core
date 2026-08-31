import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export function trekPlugin(): Plugin {
  let themePath = "";
  let resolvedOutDir = "";

  return {
    name: "trek-plugin",
    configResolved(config) {
      const resolved = import.meta.resolve("@trekscripts/ui/theme.css");
      themePath = new URL(resolved).pathname;

      resolvedOutDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/theme.css") {
          res.setHeader("Content-Type", "text/css");
          res.end(fs.readFileSync(themePath));
          return;
        }
        next();
      });
    },
    writeBundle() {
      if (!fs.existsSync(themePath)) return;

      if (!fs.existsSync(resolvedOutDir)) {
        fs.mkdirSync(resolvedOutDir, { recursive: true });
      }
      fs.copyFileSync(themePath, path.resolve(resolvedOutDir, "theme.css"));
    },
  };
}
