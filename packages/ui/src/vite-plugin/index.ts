import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

export function trek(): Plugin {
  const themePath = fileURLToPath(
    import.meta.resolve("@trekscripts/ui/theme.css")
  );

  return {
    name: "trek-plugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/theme.css") {
          res.setHeader("Content-Type", "text/css");
          return res.end(fs.readFileSync(themePath));
        }
        next();
      });
    },
    closeBundle() {
      if (!fs.existsSync(themePath)) {
        console.error(`[trek-plugin] Theme file not found at: ${themePath}`);
        return;
      }

      const outDir = path.resolve(process.cwd(), "dist");
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(themePath, path.resolve(outDir, "theme.css"));
    },
  };
}
