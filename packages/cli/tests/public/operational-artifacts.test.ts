import { describe, expect, test } from "bun:test";
import { isOperationalArtifactPath } from "../../src/public/operational-artifacts.js";

describe("operational-artifacts", () => {
  test.each([
    ".sisyphus/boulder.json",
    ".sisyphus/plans/my-plan.md",
    ".sisyphus/evidence/task-1.txt",
    ".sisyphus/notepads/foo/learnings.md",
    "/absolute/path/to/.sisyphus/boulder.json",
    "some/nested/.sisyphus/any-file.json",
    "some\\nested\\.sisyphus\\any-file.json",
    ".kb/recovery",
    ".kb/recovery/journal.json",
    "nested/.kb/recovery/journal.json",
    "nested\\.kb\\recovery\\journal.json",
  ])("returns true for operational artifact path %s", (pathLike) => {
    expect(isOperationalArtifactPath(pathLike)).toBe(true);
  });

  test.each([
    "docs/architecture.md",
    "src/boulder.ts",
    ".github/workflows/ci.yml",
    ".vscode/mcp.json",
    "AGENTS.md",
    "docs/boulder.json",
    ".sisyphuslike/file.txt",
    "x.sisyphus/file.txt",
    ".kb/recoveryx",
    ".kb/recovery-old/file",
    "x.kb/recovery/journal.json",
  ])("returns false for non-operational path %s", (pathLike) => {
    expect(isOperationalArtifactPath(pathLike)).toBe(false);
  });
});
