import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  branchStoreKey,
  branchStorePath,
} from "../../src/utils/branch-store-locator.js";

describe("kibi branch lifecycle", () => {
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-branch-"));
    process.chdir(tmpDir);
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m init", { cwd: tmpDir });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("materializes an exact hashed store without copying another branch", () => {
    const source = path.join(tmpDir, ".kb", "branches", "other/source");
    execSync(`mkdir -p '${source}' && printf source > '${source}/kb.rdf'`);
    execSync("git checkout -b feature/auth", { cwd: tmpDir, stdio: "pipe" });

    execSync(`bun ${kibiBin} branch ensure`, { cwd: tmpDir, stdio: "pipe" });

    const store = branchStorePath(tmpDir, "feature/auth");
    expect(existsSync(store)).toBe(true);
    expect(existsSync(path.join(store, "branch.json"))).toBe(true);
    expect(existsSync(path.join(store, "kb.rdf"))).toBe(false);
    expect(existsSync(path.join(tmpDir, ".kb", "branches", "feature"))).toBe(
      false,
    );
  });

  test("rejects cross-branch copying through branch ensure", () => {
    execSync("git checkout -b feature/target", { cwd: tmpDir, stdio: "pipe" });
    const result = Bun.spawnSync({
      cmd: ["bun", kibiBin, "branch", "ensure", "--from", "main"],
      cwd: tmpDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.exitCode).not.toBe(0);
    expect(new TextDecoder().decode(result.stderr)).toContain(
      "branch ensure --from was removed",
    );
  });

  test("migrates a literal nested store only with explicit apply", () => {
    const legacy = path.join(tmpDir, ".kb", "branches", "legacy/source");
    execSync(`mkdir -p '${legacy}'`);
    writeFileSync(path.join(legacy, "kb.rdf"), "<rdf:RDF></rdf:RDF>");
    execSync("git checkout -b feature/auth", { cwd: tmpDir, stdio: "pipe" });

    const preview = execSync(
      `bun ${kibiBin} branch migrate --from legacy/source --to feature/auth`,
      { cwd: tmpDir, encoding: "utf8" },
    );
    expect(preview).toContain("Preview only");
    expect(existsSync(legacy)).toBe(true);
    const approvalHash = preview.match(/Approval hash: ([a-f0-9]+)/)?.[1];
    expect(approvalHash).toBeDefined();

    const applied = execSync(
      `bun ${kibiBin} branch migrate --from legacy/source --to feature/auth --apply --approval-hash ${approvalHash}`,
      { cwd: tmpDir, encoding: "utf8" },
    );
    expect(applied).toContain("Legacy store preserved");
    const store = branchStorePath(tmpDir, "feature/auth");
    expect(
      JSON.parse(readFileSync(path.join(store, "branch.json"), "utf8")),
    ).toEqual({
      version: 1,
      branch: "feature/auth",
      key: branchStoreKey("feature/auth"),
    });
    expect(existsSync(legacy)).toBe(false);
  });

  test("recovers a damaged exact branch store only after explicit apply", async () => {
    execSync("mkdir -p documentation/requirements", { cwd: tmpDir });
    writeFileSync(
      path.join(tmpDir, "documentation/requirements/REQ-RECOVER-001.md"),
      "---\nid: REQ-RECOVER-001\ntitle: Recover branch storage\nstatus: open\n---\n\nRecovery is explicit.\n",
    );
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
    const store = branchStorePath(tmpDir, "main");
    writeFileSync(path.join(store, "CURRENT"), "corrupted-pointer\n");

    const preview = execSync(`bun ${kibiBin} branch recover`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(preview).toContain("Preview only");

    const applied = execSync(`bun ${kibiBin} branch recover --apply`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(applied).toContain("Original bytes preserved");
    const status = JSON.parse(
      execSync(`bun ${kibiBin} status --format json`, {
        cwd: tmpDir,
        encoding: "utf8",
      }),
    ) as { syncState: string; branchStore: { state: string } };
    expect(status.syncState).toBe("fresh");
    expect(status.branchStore.state).toBe("healthy");
    expect(
      readdirSync(path.join(tmpDir, ".kb", "recovery", "main")),
    ).toHaveLength(1);
  }, 30000);
});
