import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  createBriefId,
  computeContentHash,
} from "../src/idle-brief-store";
import {
  resolveBriefsDir,
  resolveAuditLogPath,
  resolveBriefFilePath,
  resolveTempBriefPath,
  atomicWriteBrief,
} from "../src/idle-brief-paths";

describe("idle-brief-store", () => {
  describe("createBriefId", () => {
    it("returns a string starting with brief-", () => {
      const id = createBriefId();
      expect(id.startsWith("brief-")).toBe(true);
    });

    it("returns unique ids", () => {
      const id1 = createBriefId();
      const id2 = createBriefId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("computeContentHash", () => {
    it("returns deterministic sha256 hex for same input", () => {
      const payload = { a: 1, b: "test" };
      const h1 = computeContentHash(payload);
      const h2 = computeContentHash(payload);
      expect(h1).toBe(h2);
      expect(h1.length).toBe(64);
    });

    it("returns different hash for different input", () => {
      const h1 = computeContentHash({ a: 1 });
      const h2 = computeContentHash({ a: 2 });
      expect(h1).not.toBe(h2);
    });
  });
});

describe("idle-brief-paths", () => {
  const workspaceRoot = "/fake/workspace";

  it("resolveBriefsDir returns .kb/briefs path", () => {
    expect(resolveBriefsDir(workspaceRoot)).toBe(
      path.join(workspaceRoot, ".kb", "briefs")
    );
  });

  it("resolveAuditLogPath includes branch", () => {
    expect(resolveAuditLogPath(workspaceRoot, "main")).toBe(
      path.join(workspaceRoot, ".kb", "branches", "main", "audit.log")
    );
  });

  it("resolveBriefFilePath uses timestamp", () => {
    const ts = 1234567890;
    expect(resolveBriefFilePath(workspaceRoot, ts)).toBe(
      path.join(workspaceRoot, ".kb", "briefs", `${ts}_brief.json`)
    );
  });

  it("resolveTempBriefPath uses .tmp suffix", () => {
    const ts = 1234567890;
    expect(resolveTempBriefPath(workspaceRoot, ts)).toBe(
      path.join(workspaceRoot, ".kb", "briefs", `${ts}_brief.json.tmp`)
    );
  });

  it("atomicWriteBrief writes temp then renames", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    const ts = Date.now();
    const content = JSON.stringify({ test: true });

    atomicWriteBrief(tmpDir, ts, content);

    const finalPath = resolveBriefFilePath(tmpDir, ts);
    const tempPath = resolveTempBriefPath(tmpDir, ts);

    expect(fs.existsSync(finalPath)).toBe(true);
    expect(fs.existsSync(tempPath)).toBe(false);
    expect(fs.readFileSync(finalPath, "utf-8")).toBe(content);

    fs.unlinkSync(finalPath);
    fs.rmdirSync(path.join(tmpDir, ".kb", "briefs"));
    fs.rmdirSync(path.join(tmpDir, ".kb"));
    fs.rmdirSync(tmpDir);
  });
});
