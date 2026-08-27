import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "../helpers/isolated-env.js";

describe("kibi search", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-search-"));
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    mkdirSync(path.join(tmpDir, ".kb", "requirements"), {
      recursive: true,
    });
    mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    mkdirSync(path.join(tmpDir, ".kb", "facts"), {
      recursive: true,
    });

    writeFileSync(
      path.join(tmpDir, ".kb", "requirements", "REQ-001.md"),
      "---\nid: REQ-001\ntitle: OAuth login flow\nstatus: open\n---\n\nThe markdown body mentions latent discovery token.\n",
    );

    writeFileSync(
      path.join(tmpDir, "src", "hidden.ts"),
      "export const hidden = 'latent discovery token';\n",
    );

    writeFileSync(
      path.join(
        tmpDir,
        ".kb",
        "facts",
        "FACT-apple-signin-revenuecat-recovery.md",
      ),
      [
        "---",
        "id: FACT-apple-signin-revenuecat-recovery",
        "title: Apple Sign-In RevenueCat Recovery",
        "status: open",
        "type: fact",
        "---",
        "",
        "Apple Sign-In recovery restores RevenueCat entitlements for premium recovery.",
        "The flow supports logged-out recovery when people cannot log in and need premium recovery.",
        "",
      ].join("\n"),
    );

    writeFileSync(
      path.join(
        tmpDir,
        ".kb",
        "requirements",
        "REQ-search-revenuecat-entitlement.md",
      ),
      [
        "---",
        "id: REQ-search-revenuecat-entitlement",
        "title: RevenueCat Entitlement Requirement",
        "status: open",
        "---",
        "",
        "RevenueCat entitlement verification must restore premium access deterministically.",
        "The requirement is specifically about RevenueCat entitlement handling.",
        "",
      ].join("\n"),
    );

    writeFileSync(
      path.join(
        tmpDir,
        ".kb",
        "facts",
        "FACT-search-unrelated-sync-feedback.md",
      ),
      [
        "---",
        "id: FACT-search-unrelated-sync-feedback",
        "title: Sync Feedback Observation",
        "status: open",
        "type: fact",
        "---",
        "",
        "Sync feedback notifications explain repository synchronization progress.",
        "This observation is about background sync status and notification delivery only.",
        "",
      ].join("\n"),
    );

    execSync("git add .kb", { cwd: tmpDir, stdio: "pipe" });

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
  }, 30000);

  afterAll(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("searches markdown content but not raw code bodies", () => {
    const output = execSync(
      `bun ${kibiBin} search "latent discovery token" --format json`,
      { cwd: tmpDir, encoding: "utf8" },
    );

    const result = JSON.parse(output) as {
      count: number;
      results: Array<{ entity: { id: string } }>;
    };
    expect(result.count).toBe(1);
    expect(result.results[0]?.entity.id).toBe("REQ-001");
  });

  test("returns improved ranking for broad synthetic corpus queries", () => {
    const query =
      "Apple Sign-In authentication premium recovery RevenueCat entitlement logged out unable to log in";

    // First invocation
    const output1 = execSync(`bun ${kibiBin} search "${query}" --format json`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    const result1 = JSON.parse(output1) as {
      count: number;
      results: Array<{
        entity: { id: string };
        score: number;
        reasons: string[];
      }>;
    };

    expect(result1.count).toBeGreaterThan(0);
    expect(result1.results[0]?.entity.id).toBe(
      "FACT-apple-signin-revenuecat-recovery",
    );

    const firstIds = result1.results.map((r) => r.entity.id);
    expect(firstIds).not.toContain("FACT-search-unrelated-sync-feedback");

    // Second invocation — deterministic across two consecutive CLI invocations
    const output2 = execSync(`bun ${kibiBin} search "${query}" --format json`, {
      cwd: tmpDir,
      encoding: "utf8",
    });

    const result2 = JSON.parse(output2) as {
      count: number;
      results: Array<{
        entity: { id: string };
        score: number;
        reasons: string[];
      }>;
    };

    expect(result2.count).toBe(result1.count);
    expect(result2.results[0]?.entity.id).toBe(result1.results[0]?.entity.id);
    expect(result2.results.map((r) => r.entity.id)).toEqual(firstIds);
  });

  test("returns empty results for no-signal queries", () => {
    const output = execSync(
      `bun ${kibiBin} search "to in out log logged unable" --format json`,
      { cwd: tmpDir, encoding: "utf8" },
    );

    const result = JSON.parse(output) as {
      count: number;
      results: Array<{ entity: { id: string } }>;
    };
    expect(result.count).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  test("returns empty output consistently for no-signal queries", () => {
    const output = execSync(
      `bun ${kibiBin} search "to in out log logged unable" --format json`,
      { cwd: tmpDir, encoding: "utf8" },
    );

    const result = JSON.parse(output) as {
      count: number;
      results: Array<{ entity: { id: string } }>;
    };

    expect(result.count).toBe(0);
    expect(result.results).toEqual([]);
  });
});
