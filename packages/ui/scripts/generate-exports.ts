import * as fs from "fs";
import * as path from "path";

const uiDir = path.join(process.cwd(), "src/components/ui");
const outputFile = path.join(process.cwd(), "src/components/index.ts");

const files = fs
  .readdirSync(uiDir)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => f.replace(".tsx", ""))
  .sort();

const exports = files.map((f) => `export * from "./ui/${f}";`).join("\n");

fs.writeFileSync(outputFile, exports + "\n");

console.log(`Generated ${files.length} exports to src/components/index.ts`);