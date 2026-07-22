import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const CANONICAL_SKILL_ROOT = path.resolve(
  import.meta.dir,
  "../../../packages/cli/src/public/skills",
);

export function temporaryRoot(): string {
  return mkdtempSync(path.join(os.tmpdir(), "kibi-skillopt-fixtures-"));
}

export function files(root: string, relative = ""): readonly string[] {
  return readdirSync(path.join(root, relative))
    .sort()
    .flatMap((entry) => {
      const child = path.join(relative, entry);
      return statSync(path.join(root, child)).isDirectory()
        ? files(root, child)
        : [child.split(path.sep).join("/")];
    });
}

export function readTree(root: string): string {
  return files(root)
    .map((relative) => readFileSync(path.join(root, relative), "utf8"))
    .join("\n");
}

export function treeHash(root: string): string {
  const hash = createHash("sha256");
  for (const relative of files(root)) {
    hash.update(relative);
    hash.update(readFileSync(path.join(root, relative)));
  }
  return hash.digest("hex");
}
