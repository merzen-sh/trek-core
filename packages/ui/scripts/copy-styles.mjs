import { cp, mkdir } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await Promise.all([cp("globals.css", "dist/globals.css"), cp("theme.css", "dist/theme.css")]);
