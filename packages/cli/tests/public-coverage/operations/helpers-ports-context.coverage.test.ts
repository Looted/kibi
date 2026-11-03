import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  scopeQualityDiagnosticsToImpact,
  stagedEntityIdStyleDiagnostics,
} from "../../../src/public/operations/check-helpers.js";
import { readAuthoredEntity } from "../../../src/public/operations/entity-context.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";

type Diagnostics = Parameters<typeof scopeQualityDiagnosticsToImpact>[0];
type Impact = Parameters<typeof scopeQualityDiagnosticsToImpact>[1];

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-helpers-cov-"));
  roots.push(root);
  return root;
}

describe("scopeQualityDiagnosticsToImpact", () => {
  test("names how many omitted rules are not listed", () => {
    const diagnostics = ["a", "b", "c", "d", "e", "f", "g"].map((rule) => ({
      id: `rule.${rule}`,
      severity: "warning",
      blocking: false,
      category: "integrity",
      message: rule,
    })) as unknown as Diagnostics;
    const kept = scopeQualityDiagnosticsToImpact(diagnostics, {
      sourceFiles: [],
      linkedEntities: [],
    } as unknown as Impact);
    expect(kept).toHaveLength(1);
    expect(JSON.stringify(kept[0])).toContain("2 more rules");
  });
});

describe("stagedEntityIdStyleDiagnostics", () => {
  test("reads the staged files of a Git work tree", () => {
    const root = tempRoot();
    execFileSync("git", ["init", "-q"], { cwd: root });
    expect(
      stagedEntityIdStyleDiagnostics(root, { staged: true }),
    ).toStrictEqual([]);
  });

  test("outside a Git work tree there is nothing to check", () => {
    const root = tempRoot();
    writeFileSync(join(root, ".git"), "not a git dir\n");
    expect(
      stagedEntityIdStyleDiagnostics(root, { staged: true }),
    ).toStrictEqual([]);
  });
});

describe("nodeFilesystem.fsync on Windows", () => {
  test("skips directories and syncs files", async () => {
    const root = tempRoot();
    const file = join(root, "f.txt");
    writeFileSync(file, "x");
    mkdirSync(join(root, "d"));
    const platform = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", { value: "win32" });
    try {
      await nodeFilesystem.fsync?.(join(root, "d"));
      await nodeFilesystem.fsync?.(file);
    } finally {
      if (platform) Object.defineProperty(process, "platform", platform);
    }
    expect(process.platform).not.toBe("win32");
  });
});

describe("readAuthoredEntity", () => {
  test("front matter that does not parse or is not a mapping reads as null", () => {
    expect(readAuthoredEntity("---\nid: [\n---\n", "x.md")).toBeNull();
    expect(readAuthoredEntity("---\n- a\n- b\n---\n", "x.md")).toBeNull();
    expect(readAuthoredEntity("---\nnull\n---\n", "x.md")).toBeNull();
  });
});
