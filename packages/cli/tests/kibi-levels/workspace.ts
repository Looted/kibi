import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const roots: string[] = [];

/** A temporary workspace holding `files`, removed by `cleanupLevelWorkspaces`. */
export function levelWorkspace(files: Record<string, string> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-levels-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  return root;
}

/** A workspace whose root package.json records `level`. */
export function atLevel(
  level: string,
  files: Record<string, string> = {},
): string {
  return levelWorkspace({
    "package.json": JSON.stringify({ name: "app", kibi: { level } }),
    ...files,
  });
}

export function cleanupLevelWorkspaces(): void {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
}

/** An authored requirement document. */
export function requirementDoc(
  id: string,
  frontmatter: Record<string, string> = {},
): string {
  const lines = Object.entries({ status: "open", ...frontmatter }).map(
    ([key, value]) => `${key}: ${value}`,
  );
  return `---\nid: ${id}\ntitle: ${id} title\ntype: req\n${lines.join("\n")}\n---\n\nThe system must keep ${id} true.\n`;
}
