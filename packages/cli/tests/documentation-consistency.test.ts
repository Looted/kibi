import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

const DOCS_ROOT = path.resolve(import.meta.dir, "../../../documentation");

function findMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function extractFrontmatterId(filePath: string): string | null {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\n[\s\S]*?^id:\s*(.+?)\s*$/m);
  return match ? match[1].trim() : null;
}

describe("documentation consistency", () => {
  test("all markdown frontmatter ids match their filename basename", () => {
    const files = findMarkdownFiles(DOCS_ROOT);
    const mismatches: string[] = [];

    for (const file of files) {
      const basename = path.basename(file, ".md");
      const id = extractFrontmatterId(file);
      if (id !== null && id !== basename) {
        mismatches.push(`${file}: id="${id}" but filename="${basename}"`);
      }
    }

    if (mismatches.length > 0) {
      throw new Error(
        `Frontmatter id/filename mismatches found:\n${mismatches.join("\n")}`,
      );
    }
    expect(mismatches).toHaveLength(0);
  });
});
