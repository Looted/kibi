import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { parseTaskSpec } from "./contracts";

type FixtureTaskSpec = ReturnType<typeof parseTaskSpec>;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function workspaceState(task: FixtureTaskSpec) {
  const stale =
    task.skill === "kibi-freshness" || task.family.includes("repair");
  const dirty =
    task.family.includes("completion") || task.family.includes("impact");
  return {
    branch: `fixture/${sha256(task.fixtureSeed).slice(0, 12)}`,
    generatedState: stale ? "stale" : "current",
    worktree: dirty ? "dirty" : "clean",
    family: task.family,
  } as const;
}

function familyDocument(task: FixtureTaskSpec): string {
  return [
    "---",
    `id: REQ-FIXTURE-${sha256(task.id).slice(0, 12).toUpperCase()}`,
    `title: ${task.family} fixture requirement`,
    "status: open",
    "---",
    "",
    `Exercise the ${task.family} behavior through the public Kibi MCP surface.`,
    "",
  ].join("\n");
}

function listFiles(root: string, relative = ""): readonly string[] {
  const directory = path.join(root, relative);
  return readdirSync(directory)
    .sort()
    .flatMap((entry) => {
      const child = path.join(relative, entry);
      return statSync(path.join(root, child)).isDirectory()
        ? listFiles(root, child)
        : [child.split(path.sep).join("/")];
    });
}

// implements REQ-skillopt-codex-optimization
export function hashWorkspace(root: string): string {
  const hash = createHash("sha256");
  for (const relativePath of listFiles(root)) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(readFileSync(path.join(root, relativePath)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

// implements REQ-skillopt-codex-optimization
export function writePublicWorkspace(
  root: string,
  task: FixtureTaskSpec,
): string {
  mkdirSync(path.join(root, "documentation", "requirements"), {
    recursive: true,
  });
  mkdirSync(path.join(root, "src"), { recursive: true });
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({ name: `fixture-${sha256(task.id).slice(0, 12)}`, private: true }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(root, "documentation", "requirements", "fixture.md"),
    familyDocument(task),
  );
  writeFileSync(
    path.join(root, "src", "fixture.ts"),
    `export const fixtureFamily = ${JSON.stringify(task.family)};\n`,
  );
  writeFileSync(
    path.join(root, ".kb", "fixture-state.json"),
    `${JSON.stringify(workspaceState(task), null, 2)}\n`,
  );
  return hashWorkspace(root);
}
