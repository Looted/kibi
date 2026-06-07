import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

describe("kibi search", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-search-"));
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    mkdirSync(path.join(tmpDir, "documentation", "requirements"), {
      recursive: true,
    });
    mkdirSync(path.join(tmpDir, "src"), { recursive: true });

    writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
      "---\nid: REQ-001\ntitle: OAuth login flow\nstatus: open\n---\n\nThe markdown body mentions latent discovery token.\n",
    );

    writeFileSync(
      path.join(tmpDir, "src", "hidden.ts"),
      "export const hidden = 'latent discovery token';\n",
    );

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
    writeFileSync(
      path.join(
        tmpDir,
        "documentation",
        "requirements",
        "REQ-search-revenuecat-entitlement.md",
      ),
      "---\nid: REQ-search-revenuecat-entitlement\ntitle: RevenueCat entitlement restore\nstatus: open\n---\n\nPremium entitlement recovery for logged out users.\n",
    );
    writeFileSync(
      path.join(
        tmpDir,
        "documentation",
        "requirements",
        "FACT-search-apple-signin-revenuecat-recovery.md",
      ),
      "---\nid: FACT-search-apple-signin-revenuecat-recovery\ntitle: Apple Sign-In RevenueCat recovery\nstatus: open\n---\n\nApple Sign-In authentication premium recovery RevenueCat entitlement logged out unable to log in.\n",
    );
    writeFileSync(
      path.join(
        tmpDir,
        "documentation",
        "requirements",
        "FACT-search-unrelated-sync-feedback.md",
      ),
      "---\nid: FACT-search-unrelated-sync-feedback\ntitle: Sync feedback note\nstatus: open\n---\n\nAn unrelated sync feedback artifact.\n",
    );
    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

    const output = execSync(
      `bun ${kibiBin} search "Apple Sign-In authentication premium recovery RevenueCat entitlement logged out unable to log in" --format json`,
      { cwd: tmpDir, encoding: "utf8" },
    );

    const result = JSON.parse(output) as {
      count: number;
      results: Array<{ entity: { id: string } }>;
    };
    expect(result.results[0]?.entity.id).toBe(
      "FACT-search-apple-signin-revenuecat-recovery",
    );
    expect(result.results.map((r) => r.entity.id)).toContain(
      "REQ-search-revenuecat-entitlement",
    );
    expect(
      result.results.some(
        (r) => r.entity.id === "FACT-search-unrelated-sync-feedback",
      ),
    ).toBe(false);
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
