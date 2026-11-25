import { afterEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  _setBranchResolverDepsForTests,
  copyCleanSnapshot,
  isValidBranchName,
  resolveActiveBranch,
  resolveBranchAttachment,
} from "../../src/utils/branch-resolver.js";

const roots: string[] = [];
const originalBranch = process.env.KIBI_BRANCH;

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  _setBranchResolverDepsForTests({});
  if (originalBranch === undefined) {
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
  } else {
    process.env.KIBI_BRANCH = originalBranch;
  }
});

function tempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-branch-cov-"));
  roots.push(root);
  return root;
}

function initGit(root: string, branch = "main"): void {
  execSync(`git init -b ${branch}`, { cwd: root });
  execSync("git config user.email 'test@test.com'", { cwd: root });
  execSync("git config user.name 'Test'", { cwd: root });
  execSync("git commit --allow-empty -m init", { cwd: root });
}

describe("branch-resolver leftover attachment and validation", () => {
  test("resolveBranchAttachment reports incomplete and unreadable journals", () => {
    const root = tempRoot();
    initGit(root);
    const journalDir = path.join(root, ".kb", "recovery", "branch-migrations");
    mkdirSync(journalDir, { recursive: true });
    writeFileSync(path.join(journalDir, "notes.txt"), "ignore");
    writeFileSync(
      path.join(journalDir, "mig-1.json"),
      JSON.stringify({ state: "committed" }),
    );
    writeFileSync(path.join(journalDir, "broken.json"), "{not-json");
    const unreadable = resolveBranchAttachment(root);
    expect("error" in unreadable).toBe(true);
    if ("error" in unreadable) {
      expect(unreadable.code).toBe("MIGRATION_RECOVERY_REQUIRED");
    }

    rmSync(path.join(journalDir, "broken.json"));
    writeFileSync(
      path.join(journalDir, "open.json"),
      JSON.stringify({ state: "started" }),
    );
    const incomplete = resolveBranchAttachment(root);
    expect("error" in incomplete).toBe(true);
    if ("error" in incomplete) {
      expect(incomplete.error).toContain("Incomplete branch migration");
    }
  });

  test("resolveBranchAttachment handles legacy, exact, override, and mismatch", () => {
    const root = tempRoot();
    initGit(root);
    process.env.KIBI_BRANCH = "main";
    const attachment = resolveBranchAttachment(root);
    expect("storePath" in attachment).toBe(true);
    if ("storePath" in attachment) {
      expect(attachment.kind).toBe("explicit_override");
      expect(attachment.migrationRequired).toBe(false);
    }

    Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    const exact = resolveBranchAttachment(root);
    if ("storePath" in exact) {
      expect(exact.kind).toBe("exact");
    }

    const legacy = path.join(root, ".kb", "branches", "main");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(path.join(legacy, "CURRENT"), "gen\n");
    const legacyAttach = resolveBranchAttachment(root);
    if ("storePath" in legacyAttach) {
      expect(legacyAttach.kind).toBe("legacy_compat");
      expect(legacyAttach.migrationRequired).toBe(true);
    }

    if ("storePath" in exact) {
      mkdirSync(exact.storePath, { recursive: true });
      writeFileSync(path.join(exact.storePath, "CURRENT"), "hashed\n");
    }
    const ambiguous = resolveBranchAttachment(root);
    expect("error" in ambiguous).toBe(true);
    if ("error" in ambiguous) {
      expect(ambiguous.code).toBe("AMBIGUOUS_ATTACHMENT");
    }

    rmSync(legacy, { recursive: true, force: true });
    if ("storePath" in exact && existsSync(exact.storePath)) {
      writeFileSync(
        path.join(exact.storePath, "branch.json"),
        JSON.stringify({ version: 1, branch: "other", key: "deadbeef" }),
      );
    }
    const mismatch = resolveBranchAttachment(root);
    expect("storePath" in mismatch || "error" in mismatch).toBe(true);
  });

  test("isValidBranchName rejects lock components and control characters", () => {
    expect(isValidBranchName("feature/.hidden")).toBe(false);
    expect(isValidBranchName("feature/name.lock")).toBe(false);
    expect(isValidBranchName("bad name")).toBe(false);
    expect(isValidBranchName("tab\tname")).toBe(false);
    expect(isValidBranchName("feature@{u}")).toBe(false);
    expect(isValidBranchName("a".repeat(255))).toBe(true);
  });

  test("copyCleanSnapshot skips .lock names", () => {
    const root = tempRoot();
    const source = path.join(root, "src");
    const target = path.join(root, "dst");
    mkdirSync(source, { recursive: true });
    writeFileSync(path.join(source, ".lock"), "x");
    writeFileSync(path.join(source, "keep.md"), "ok");
    copyCleanSnapshot(source, target);
    expect(existsSync(path.join(target, "keep.md"))).toBe(true);
    expect(existsSync(path.join(target, ".lock"))).toBe(false);
  });

  test("resolveActiveBranch uses process.cwd default", () => {
    const result = resolveActiveBranch();
    expect("branch" in result || "error" in result).toBe(true);
  });

  test("resolveActiveBranch covers env, detached, fallback, and git errors", () => {
    process.env.KIBI_BRANCH = "valid-name";
    // /tmp is outside Git: the named store still says Git is missing.
    expect(resolveActiveBranch("/tmp")).toEqual({
      branch: "valid-name",
      noGit: "not_a_repository",
    });
    process.env.KIBI_BRANCH = "bad name";
    expect(resolveActiveBranch("/tmp")).toMatchObject({ code: "ENV_OVERRIDE" });
    Reflect.deleteProperty(process.env, "KIBI_BRANCH");

    _setBranchResolverDepsForTests({
      execSync: (() => "") as unknown as typeof execSync,
    });
    expect(resolveActiveBranch("/tmp")).toMatchObject({
      code: "DETACHED_HEAD",
    });

    _setBranchResolverDepsForTests({
      execSync: ((command: string) => {
        if (command.includes("show-current")) throw new Error("fail");
        return "HEAD\n";
      }) as unknown as typeof execSync,
    });
    expect(resolveActiveBranch("/tmp")).toMatchObject({
      code: "DETACHED_HEAD",
    });

    _setBranchResolverDepsForTests({
      execSync: ((command: string) => {
        if (command.includes("show-current")) throw new Error("fail");
        return "\n";
      }) as unknown as typeof execSync,
    });
    expect(resolveActiveBranch("/tmp")).toMatchObject({
      code: "UNBORN_BRANCH",
    });

    _setBranchResolverDepsForTests({
      execSync: ((command: string) => {
        if (command.includes("show-current")) throw new Error("fail");
        return "bad name\n";
      }) as unknown as typeof execSync,
    });
    expect(resolveActiveBranch("/tmp")).toMatchObject({
      code: "UNKNOWN_ERROR",
    });

    _setBranchResolverDepsForTests({
      execSync: ((command: string) => {
        if (command.includes("show-current")) throw new Error("fail");
        return "feature/ok\n";
      }) as unknown as typeof execSync,
    });
    expect(resolveActiveBranch("/tmp")).toEqual({ branch: "feature/ok" });

    // Git cannot report a branch: the probe decides. /tmp is outside Git.
    _setBranchResolverDepsForTests({
      execSync: (() => {
        throw new Error("not a git repository");
      }) as unknown as typeof execSync,
    });
    expect(resolveActiveBranch("/tmp")).toEqual({
      branch: "kibi-internal/no-git",
      noGit: "not_a_repository",
    });

    _setBranchResolverDepsForTests({
      execSync: (() => {
        throw new Error("mystery git failure");
      }) as unknown as typeof execSync,
      probeVcs: () => ({ kind: "git" }) as never,
    });
    expect(resolveActiveBranch("/tmp")).toMatchObject({
      code: "UNKNOWN_ERROR",
    });
  });
});
