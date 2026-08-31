#!/usr/bin/env node
import fs from "fs";
import path from "path";

interface AliasRule {
  prefix: string;
  replace: string;
}

const UI_DIR: string = path.resolve("src/components/ui");

if (!fs.existsSync(UI_DIR)) {
  console.error(`Error: Directory not found: ${UI_DIR}`);
  process.exit(1);
}

const dirContents: string[] = fs.readdirSync(UI_DIR);
const TSX_FILES: string[] = dirContents
  .filter((f: string) => f.endsWith(".tsx"))
  .map((f: string) => path.join(UI_DIR, f));

const ALIAS_MAP: AliasRule[] = [
  { prefix: "@/components/ui", replace: "./" },
  { prefix: "@/components", replace: "../components" },
  { prefix: "@/lib/utils", replace: "../../lib/utils" },
  { prefix: "@/lib", replace: "../../lib" },
  { prefix: "@/hooks", replace: "../../hooks" },
];

function resolveRelativePath(importPath: string): string | null {
  for (const { prefix, replace } of ALIAS_MAP) {
    if (importPath === prefix) {
      return replace;
    }
    if (importPath.startsWith(prefix + "/")) {
      const suffix: string = importPath.slice(prefix.length + 1);
      const joined: string = path.posix.join(replace, suffix);
      return joined.startsWith(".") ? joined : "./" + joined;
    }
  }
  return null;
}

function replaceAliases(filePath: string): number {
  const content: string = fs.readFileSync(filePath, "utf-8");
  let count: number = 0;

  const importRegex = /(from|import|export)\s+(["'])(@\/[^"']+)\2/g;

  const updatedContent: string = content.replace(
    importRegex,
    (match: string, statement: string, quote: string, originalPath: string) => {
      const relativePath: string | null = resolveRelativePath(originalPath);

      if (relativePath) {
        count++;
        return `${statement} ${quote}${relativePath}${quote}`;
      }
      return match;
    },
  );

  if (count > 0) {
    fs.writeFileSync(filePath, updatedContent, "utf-8");
    console.log(`Fixed ${count} alias(es) in ${path.basename(filePath)}`);
  }
  return count > 0 ? 1 : 0;
}

let updatedFilesCount: number = 0;
for (const file of TSX_FILES) {
  updatedFilesCount += replaceAliases(file);
}

console.log(`\nSummary: Updated ${updatedFilesCount} / ${TSX_FILES.length} files.`);
