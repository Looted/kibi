// implements REQ-008
import { afterEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  _setBranchResolverDepsForTests,
  copyCleanSnapshot,
  getBranchDiagnostic,
  getVolatileArtifactPatterns,
  isDetachedHead,
  isValidBranchName,
  resolveActiveBranch,
  resolveBranchAttachment,
  resolveDefaultBranch,
} from "../../src/utils/branch-resolver.js";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  _setBranchResolverDepsForTests({});
  for (const root of roots.splice(0)) removeTempDir(root);
  process.exitCode = 0;
});

describe("branch-resolver leftover validation, snapshot, and diagnostic branches", () => {
  test("isValidBranchName rejects empty, oversized, absolute, and unsafe names", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    expect(isValidBranchName("")).toBe(false);
    expect(isValidBranchName("a".repeat(256))).toBe(false);
    expect(isValidBranchName("/abs")).toBe(false);
    expect(isValidBranchName("feat//x")).toBe(false);
    expect(isValidBranchName("feat/")).toBe(false);
    expect(isValidBranchName("feat.")).toBe(false);
    expect(isValidBranchName("-bad")).toBe(false);
    expect(isValidBranchName("feat\\x")).toBe(false);
    expect(isValidBranchName("feat^x")).toBe(false);
    expect(isValidBranchName("ok-name")).toBe(true);
  });

  test("getBranchDiagnostic includes a detected branch and resolution options", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const withBranch = getBranchDiagnostic("develop", "mystery");
    expect(withBranch).toContain("Detected branch: develop");
    expect(withBranch).toContain("KIBI_BRANCH");
    const without = getBranchDiagnostic(undefined, "no branch");
    expect(without).not.toContain("Detected branch:");
  });

  test("isDetachedHead reports HEAD, a named branch, and command failure", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    _setBranchResolverDepsForTests({
      execSync: (() => "HEAD\n") as unknown as typeof execSync,
    });
    expect(isDetachedHead("/tmp")).toBe(true);
    _setBranchResolverDepsForTests({
      execSync: (() => "develop\n") as unknown as typeof execSync,
    });
    expect(isDetachedHead("/tmp")).toBe(false);
    _setBranchResolverDepsForTests({
      execSync: (() => {
        throw new Error("git missing");
      }) as unknown as typeof execSync,
    });
    expect(isDetachedHead("/tmp")).toBe(true);
  });

  test("copyCleanSnapshot skips volatile artifacts and copies nested files", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = createTempDir("kibi-branch-copy-");
    roots.push(root);
    const source = path.join(root, "src");
    const target = path.join(root, "dst");
    mkdirSync(path.join(source, "nested"), { recursive: true });
    writeFileSync(path.join(source, "keep.md"), "ok");
    writeFileSync(path.join(source, "nested", "inner.md"), "in");
    writeFileSync(path.join(source, "sync-cache.json"), "{}");
    writeFileSync(path.join(source, "journal-1.log"), "j");
    writeFileSync(path.join(source, "tmp.pid"), "1");
    writeFileSync(path.join(source, "scratch.tmp"), "t");
    copyCleanSnapshot(source, target);
    expect(existsSync(path.join(target, "keep.md"))).toBe(true);
    expect(existsSync(path.join(target, "nested", "inner.md"))).toBe(true);
    expect(existsSync(path.join(target, "sync-cache.json"))).toBe(false);
    expect(existsSync(path.join(target, "journal-1.log"))).toBe(false);
    expect(existsSync(path.join(target, "tmp.pid"))).toBe(false);
    expect(() => copyCleanSnapshot(path.join(root, "missing"), target)).toThrow(
      /does not exist/,
    );
    expect(getVolatileArtifactPatterns()).toContain("journal-*.log");
  });

  test("resolveDefaultBranch returns a valid remote default", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    _setBranchResolverDepsForTests({
      execSync: ((command: string) => {
        if (command.includes("symbolic-ref"))
          return "refs/remotes/origin/develop\n";
        throw new Error("unused");
      }) as unknown as typeof execSync,
    });
    expect(resolveDefaultBranch("/tmp")).toEqual({ branch: "develop" });
  });

  test("resolveActiveBranch rejects an invalid show-current name", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    _setBranchResolverDepsForTests({
      execSync: (() => "bad name\n") as unknown as typeof execSync,
    });
    expect(resolveActiveBranch("/tmp")).toMatchObject({ code: "UNKNOWN_ERROR" });
    _setBranchResolverDepsForTests({
      execSync: (() => {
        throw "not-an-error";
      }) as unknown as typeof execSync,
    });
    expect(resolveActiveBranch("/tmp")).toMatchObject({ code: "UNKNOWN_ERROR" });
  });

  test("blocks attachment on an unreadable migration journal", () => {
    restores.push(isolateKibiEnv());
    const root = createTempDir("kibi-branch-journal-");
    roots.push(root);
    mkdirSync(path.join(root, ".git"), { recursive: true });
    mkdirSync(path.join(root, ".kb", "recovery", "branch-migrations"), {
      recursive: true,
    });
    writeFileSync(
      path.join(root, ".kb", "recovery", "branch-migrations", "mig-1.json"),
      "{not-json",
    );
    _setBranchResolverDepsForTests({
      execSync: ((command: string) => {
        if (String(command).includes("rev-parse --abbrev-ref HEAD")) {
          return "develop\n";
        }
        if (String(command).includes("rev-parse --is-inside-work-tree")) {
          return "true\n";
        }
        return "develop\n";
      }) as unknown as typeof execSync,
    });
    expect(resolveBranchAttachment(root)).toMatchObject({
      code: "MIGRATION_RECOVERY_REQUIRED",
      error: expect.stringContaining("Unreadable branch migration journal"),
    });
  });

  test("walks past a committed migration journal to the store check", () => {
    restores.push(isolateKibiEnv());
    const root = createTempDir("kibi-branch-journal-ok-");
    roots.push(root);
    mkdirSync(path.join(root, ".git"), { recursive: true });
    mkdirSync(path.join(root, ".kb", "recovery", "branch-migrations"), {
      recursive: true,
    });
    writeFileSync(
      path.join(root, ".kb", "recovery", "branch-migrations", "notes.txt"),
      "skip",
    );
    writeFileSync(
      path.join(root, ".kb", "recovery", "branch-migrations", "mig-ok.json"),
      JSON.stringify({ state: "committed" }),
    );
    _setBranchResolverDepsForTests({
      execSync: ((command: string) => {
        if (String(command).includes("rev-parse --abbrev-ref HEAD")) {
          return "develop\n";
        }
        if (String(command).includes("rev-parse --is-inside-work-tree")) {
          return "true\n";
        }
        return "develop\n";
      }) as unknown as typeof execSync,
    });
    const attachment = resolveBranchAttachment(root);
    expect("error" in attachment ? attachment.code : "ok").not.toBe(
      "MIGRATION_RECOVERY_REQUIRED",
    );
  });

  test("isValidBranchName returns false when git check-ref-format throws", () => {
    restores.push(isolateKibiEnv());
    _setBranchResolverDepsForTests({
      execFileSync: (() => {
        throw new Error("ref rejected");
      }) as never,
    });
    expect(isValidBranchName("ok-name")).toBe(false);
  });
});
