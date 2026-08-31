import tailwindcss from "@tailwindcss/vite";
import { trekPlugin } from "@trekscripts/ui/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), trekPlugin()],
  build: { rolldownOptions: { treeshake: true },outDir: "../ui" },
});
