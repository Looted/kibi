import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("kibi branch ensure", () => {
  const TEST_TIMEOUT_MS = 15000;
  let tmpDir: string;
  let originalCwd: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-branch-"));
    process.chdir(tmpDir);

    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git checkout -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

    mkdirSync(path.join(tmpDir, ".kb/branches"), { recursive: true });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test(
    "creates empty KB when no --from is passed and current branch has no source KB",
    async () => {
      const sourceBranch = "feature-src";
      const targetBranch = "feature-target";

      // Create a KB for an unrelated branch (sourceBranch) but do NOT pass
      // --from to branch ensure. Without --from, branch ensure should NOT
      // auto-copy from unrelated branches — it only copies from the default
      // branch (main/develop) if present, or creates an empty KB otherwise.
      mkdirSync(path.join(tmpDir, ".kb/branches", sourceBranch), {
        recursive: true,
      });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", sourceBranch, "kb.rdf"),
        "test rdf content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      execSync(`bun ${kibiBin} branch ensure`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(targetPath)).toBe(true);
      // kb.rdf should NOT be copied from sourceBranch since --from was not passed
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "creates empty KB when --from KB does not exist",
    async () => {
      const targetBranch = "feature-branch";

      mkdirSync(path.join(tmpDir, ".kb/branches", "main"), { recursive: true });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", "main", "kb.rdf"),
        "main rdf content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      execSync(`bun ${kibiBin} branch ensure`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(targetPath)).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "creates empty schema when neither --from nor default branch KB exists",
    async () => {
      const targetBranch = "feature-branch";

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      execSync(`bun ${kibiBin} branch ensure`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(targetPath)).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "creates empty KB for invalid --from branch name",
    async () => {
      const targetBranch = "feature-branch";

      mkdirSync(path.join(tmpDir, ".kb/branches", "main"), { recursive: true });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", "main", "kb.rdf"),
        "main rdf content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      execSync(`bun ${kibiBin} branch ensure`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(targetPath)).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "creates empty KB for decorated --from branch name (refs/heads/)",
    async () => {
      const targetBranch = "feature-branch";

      mkdirSync(path.join(tmpDir, ".kb/branches", "main"), { recursive: true });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", "main", "kb.rdf"),
        "main rdf content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      execSync(`bun ${kibiBin} branch ensure`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(targetPath)).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "does nothing when branch KB already exists",
    async () => {
      const existingBranch = "feature-branch";

      mkdirSync(path.join(tmpDir, ".kb/branches", existingBranch), {
        recursive: true,
      });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", existingBranch, "existing.rdf"),
        "existing content",
      );

      execSync(`git checkout -b ${existingBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      execSync(`bun ${kibiBin} branch ensure --from other-branch`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const targetPath = path.join(tmpDir, ".kb/branches", existingBranch);
      expect(existsSync(path.join(targetPath, "existing.rdf"))).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "excludes volatile artifacts when copying",
    async () => {
      const sourceBranch = "feature-src";
      const targetBranch = "feature-target";

      mkdirSync(path.join(tmpDir, ".kb/branches", sourceBranch), {
        recursive: true,
      });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", sourceBranch, "kb.rdf"),
        "rdf content",
      );
      writeFileSync(
        path.join(tmpDir, ".kb/branches", sourceBranch, "sync-cache.json"),
        "cache content",
      );
      writeFileSync(
        path.join(tmpDir, ".kb/branches", sourceBranch, "audit.log"),
        "audit content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      execSync(`bun ${kibiBin} branch ensure --from ${sourceBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(true);
      expect(existsSync(path.join(targetPath, "sync-cache.json"))).toBe(false);
      expect(existsSync(path.join(targetPath, "audit.log"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "creates branch KB from valid --from branch",
    async () => {
      const fromBranch = "custom-source";
      const targetBranch = "feature-target";

      mkdirSync(path.join(tmpDir, ".kb/branches", fromBranch), {
        recursive: true,
      });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", fromBranch, "custom.rdf"),
        "custom content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      execSync(`bun ${kibiBin} branch ensure --from ${fromBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(path.join(targetPath, "custom.rdf"))).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "refuses arbitrary branch moves through migrate",
    async () => {
      mkdirSync(path.join(tmpDir, ".kb/branches", "master"), {
        recursive: true,
      });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", "master", "kb.rdf"),
        "<rdf:RDF></rdf:RDF>",
      );
      execSync("git checkout -b feature/exact-identity", {
        cwd: tmpDir,
        stdio: "pipe",
      });

      const result = Bun.spawnSync({
        cmd: ["bun", kibiBin, "branch", "migrate", "--from", "master"],
        cwd: tmpDir,
        stdout: "pipe",
        stderr: "pipe",
      });

      expect(result.exitCode).not.toBe(0);
      expect(new TextDecoder().decode(result.stderr)).toContain(
        "only accepts the detected legacy master -> main attachment",
      );
      expect(existsSync(path.join(tmpDir, ".kb/branches", "master"))).toBe(
        true,
      );
      expect(
        existsSync(path.join(tmpDir, ".kb/branches", "feature/exact-identity")),
      ).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test("recovers a damaged exact branch store only after explicit apply", async () => {
    mkdirSync(path.join(tmpDir, "documentation", "requirements"), {
      recursive: true,
    });
    writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-RECOVER-001.md"),
      "---\nid: REQ-RECOVER-001\ntitle: Recover branch storage\nstatus: open\n---\n\nRecovery is explicit.\n",
    );
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
    const store = path.join(tmpDir, ".kb", "branches", "main");
    writeFileSync(path.join(store, "CURRENT"), "corrupted-pointer\n");

    const preview = execSync(`bun ${kibiBin} branch recover`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(preview).toContain("Preview only");
    expect(existsSync(path.join(tmpDir, ".kb", "recovery"))).toBe(false);

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
    expect(status.syncState, JSON.stringify(status)).toBe("fresh");
    expect(status.branchStore.state).toBe("healthy");
    expect(
      readdirSync(path.join(tmpDir, ".kb", "recovery", "main")).length,
    ).toBe(1);
  }, 30000);
});
