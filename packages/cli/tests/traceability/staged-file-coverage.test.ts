import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getStagedInventory } from "../../src/traceability/git-staged.js";
import { analyzeStagedFileCoverage } from "../../src/traceability/staged-file-coverage.js";

const roots: string[] = [];
const originalCwd = process.cwd();

function git(root: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function createRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-staged-file-coverage-"));
  roots.push(root);
  git(root, "init", "-b", "main");
  git(root, "config", "user.name", "Test User");
  git(root, "config", "user.email", "test@example.com");
  return root;
}

afterEach(() => {
  process.chdir(originalCwd);
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("staged file-level coverage", () => {
  it("treats an unborn branch as having no committed ownership", () => {
    const root = createRepo();
    writeFileSync(join(root, "first.py"), "print('first')\n");
    git(root, "add", "first.py");
    process.chdir(root);

    const result = analyzeStagedFileCoverage(getStagedInventory());
    expect(result.files).toContainEqual(
      expect.objectContaining({ path: "first.py", analysisDepth: "file" }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        id: "staged_file_ownership_missing",
        path: "first.py",
      }),
    );
  });

  it("uses committed plus matching staged evidence and ignores unrelated or unstaged KB edits", () => {
    const root = createRepo();
    mkdirSync(join(root, ".kb", "requirements"), { recursive: true });
    mkdirSync(join(root, "deploy"), { recursive: true });
    writeFileSync(
      join(root, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-deploy\n    title: Deployment configuration\n    sourceFile: deploy/compose.yaml\n    granularity_reason: config-artifact\n    links: [REQ-deploy]\n",
    );
    writeFileSync(
      join(root, ".kb", "requirements", "REQ-deploy.md"),
      "---\nid: REQ-deploy\ntype: req\ntitle: Deployment\nstatus: open\ncreated_at: 2026-09-14T00:00:00Z\nupdated_at: 2026-09-14T00:00:00Z\n---\nDeployment behavior.\n",
    );
    writeFileSync(join(root, "deploy", "compose.yaml"), "services: {}\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "baseline");
    process.chdir(root);

    writeFileSync(
      join(root, "deploy", "compose.yaml"),
      "services:\n  web: {}\n",
    );
    git(root, "add", "deploy/compose.yaml");
    let result = analyzeStagedFileCoverage(getStagedInventory());
    expect(
      result.files.find((file) => file.path === "deploy/compose.yaml"),
    ).toMatchObject({
      analysisDepth: "file",
      requirementIds: ["REQ-deploy"],
      evidencePaths: [],
    });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ id: "staged_file_impact_review_needed" }),
    );

    writeFileSync(
      join(root, ".kb", "requirements", "REQ-other.md"),
      "---\nid: REQ-other\ntype: req\ntitle: Other\nstatus: open\ncreated_at: 2026-09-14T00:00:00Z\nupdated_at: 2026-09-14T00:00:00Z\n---\nUnrelated.\n",
    );
    git(root, "add", ".kb/requirements/REQ-other.md");
    result = analyzeStagedFileCoverage(getStagedInventory());
    expect(
      result.files.find((file) => file.path === "deploy/compose.yaml")
        ?.evidencePaths,
    ).toEqual([]);

    writeFileSync(
      join(root, ".kb", "requirements", "REQ-deploy.md"),
      "---\nid: REQ-deploy\ntype: req\ntitle: Deployment\nstatus: open\ncreated_at: 2026-09-14T00:00:00Z\nupdated_at: 2026-09-14T00:00:00Z\n---\nDeployment behavior changed.\n",
    );
    git(root, "add", ".kb/requirements/REQ-deploy.md");
    result = analyzeStagedFileCoverage(getStagedInventory());
    expect(
      result.files.find((file) => file.path === "deploy/compose.yaml")
        ?.evidencePaths,
    ).toEqual([".kb/requirements/REQ-deploy.md"]);
    expect(
      result.diagnostics.some(
        (diagnostic) =>
          diagnostic.path === "deploy/compose.yaml" &&
          diagnostic.id === "staged_file_impact_review_needed",
      ),
    ).toBe(false);

    writeFileSync(join(root, "unowned.py"), "def run():\n    pass\n");
    git(root, "add", "unowned.py");
    result = analyzeStagedFileCoverage(getStagedInventory());
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        id: "staged_file_ownership_missing",
        path: "unowned.py",
      }),
    );

    writeFileSync(
      join(root, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-unowned\n    title: Unstaged Python module\n    sourceFile: unowned.py\n    links: [REQ-deploy]\n",
    );
    result = analyzeStagedFileCoverage(getStagedInventory());
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        id: "staged_file_ownership_missing",
        path: "unowned.py",
      }),
    );
  });

  it("requires real requirements and accepts only matching typed staged relationships", () => {
    const root = createRepo();
    mkdirSync(join(root, ".kb", "requirements"), { recursive: true });
    mkdirSync(join(root, ".kb", "relationships"), { recursive: true });
    writeFileSync(
      join(root, ".kb", "requirements", "REQ-script.md"),
      "---\nid: REQ-script\ntype: req\ntitle: Script behavior\nstatus: open\ncreated_at: 2026-09-14T00:00:00Z\nupdated_at: 2026-09-14T00:00:00Z\n---\nScript behavior.\n",
    );
    writeFileSync(
      join(root, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-script\n    title: Script module\n    sourceFile: scripts/run.py\n    granularity_reason: module-boundary\n",
    );
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(
      join(root, "scripts", "run.py"),
      "def run():\n    return 1\n",
    );
    git(root, "add", ".");
    git(root, "commit", "-m", "baseline");
    process.chdir(root);

    writeFileSync(
      join(root, "scripts", "run.py"),
      "def run():\n    return 2\n",
    );
    writeFileSync(
      join(root, ".kb", "relationships", "links.yaml"),
      "relationships:\n  - from: SYM-script\n    to: REQ-missing\n    type: implements\n  - from: SYM-script\n    to: REQ-script\n    type: relates_to\n",
    );
    git(root, "add", "scripts/run.py", ".kb/relationships/links.yaml");
    let result = analyzeStagedFileCoverage(getStagedInventory());
    expect(
      result.files.find((file) => file.path === "scripts/run.py")
        ?.requirementIds,
    ).toEqual([]);

    writeFileSync(
      join(root, ".kb", "relationships", "links.yaml"),
      "relationships:\n  - from: SYM-script\n    to: REQ-script\n    type: implements\n",
    );
    git(root, "add", ".kb/relationships/links.yaml");
    result = analyzeStagedFileCoverage(getStagedInventory());
    expect(
      result.files.find((file) => file.path === "scripts/run.py"),
    ).toMatchObject({
      requirementIds: ["REQ-script"],
      evidencePaths: [".kb/relationships/links.yaml"],
    });
  });

  it("uses committed ownership to review file and ownership removals", () => {
    const root = createRepo();
    mkdirSync(join(root, ".kb", "requirements"), { recursive: true });
    mkdirSync(join(root, "scripts"), { recursive: true });
    writeFileSync(
      join(root, ".kb", "requirements", "REQ-cleanup.md"),
      "---\nid: REQ-cleanup\ntype: req\ntitle: Cleanup\nstatus: open\ncreated_at: 2026-09-14T00:00:00Z\nupdated_at: 2026-09-14T00:00:00Z\n---\nCleanup behavior.\n",
    );
    writeFileSync(
      join(root, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-cleanup\n    title: Cleanup script\n    sourceFile: scripts/cleanup.sh\n    granularity_reason: script-boundary\n    links: [REQ-cleanup]\n",
    );
    writeFileSync(join(root, "scripts", "cleanup.sh"), "#!/bin/sh\nexit 0\n");
    git(root, "add", ".");
    git(root, "commit", "-m", "baseline");
    process.chdir(root);

    writeFileSync(join(root, ".kb", "symbols.yaml"), "symbols: []\n");
    git(root, "rm", "scripts/cleanup.sh");
    git(root, "add", ".kb/symbols.yaml");
    const result = analyzeStagedFileCoverage(getStagedInventory());
    expect(
      result.files.find((file) => file.path === "scripts/cleanup.sh"),
    ).toMatchObject({
      status: "D",
      requirementIds: ["REQ-cleanup"],
      evidencePaths: [".kb/symbols.yaml"],
    });
  });
});
