import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("kibi sync", () => {
  const TEST_TIMEOUT_MS = 20000;
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-sync-"));

    // Initialize KB structure
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // Create test fixtures
    const reqDir = path.join(tmpDir, "requirements");
    const scenarioDir = path.join(tmpDir, "scenarios");

    mkdirSync(reqDir, { recursive: true });
    mkdirSync(scenarioDir, { recursive: true });

    // Requirement document
    writeFileSync(
      path.join(reqDir, "req1.md"),
      `---
title: User Authentication
type: req
status: approved
tags: [security, auth]
owner: alice
links:
  - type: relates_to
    target: scenario1
---

# User Authentication

System must support OAuth2 authentication.
`,
    );

    // Scenario document
    writeFileSync(
      path.join(scenarioDir, "scenario1.md"),
      `---
title: Login Flow
status: active
tags: [auth]
---

# Login Flow

User logs in with OAuth2 provider.
`,
    );

    // Symbol manifest
    writeFileSync(
      path.join(tmpDir, "symbols.yaml"),
      `symbols:
  - title: authenticate()
    status: implemented
    tags: [auth]
  - title: logout()
    status: implemented
    tags: [auth]
`,
    );
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test(
    "imports entities from configured paths",
    async () => {
      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(output).toContain("Imported");
      expect(output).toMatch(/\d+ entities/);
      expect(output).toMatch(/\d+ relationships/);

      const currentBranch =
        execSync("git branch --show-current", {
          cwd: tmpDir,
          encoding: "utf8",
        }).trim() || "main";
      const effectiveBranch =
        currentBranch === "master" ? "main" : currentBranch;
      const kbPath = path.join(tmpDir, `.kb/branches/${effectiveBranch}`);
      expect(existsSync(path.join(kbPath, "kb.rdf"))).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "skips unchanged files on re-run using hash cache",
    async () => {
      const firstRun = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const firstMatch = firstRun.match(/Imported (\d+) entities/);
      const firstCount = firstMatch ? Number.parseInt(firstMatch[1]) : 0;
      expect(firstCount).toBeGreaterThan(0);

      const secondRun = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const secondMatch = secondRun.match(/Imported (\d+) entities/);
      const secondCount = secondMatch ? Number.parseInt(secondMatch[1]) : 0;

      expect(secondCount).toBeLessThan(firstCount);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "writes sync cache with per-file hashes",
    async () => {
      execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const cachePath = path.join(tmpDir, ".kb/branches/main/sync-cache.json");
      expect(existsSync(cachePath)).toBe(true);

      const cache = JSON.parse(readFileSync(cachePath, "utf8")) as {
        version: number;
        hashes: Record<string, string>;
        seenAt: Record<string, string>;
      };

      expect(cache.version).toBe(1);
      expect(Object.keys(cache.hashes).length).toBeGreaterThanOrEqual(3);
      expect(cache.hashes["documentation/requirements/req1.md"]).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(cache.hashes["documentation/scenarios/scenario1.md"]).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(cache.hashes["symbols.yaml"]).toMatch(/^[a-f0-9]{64}$/);
      expect(typeof cache.seenAt["documentation/requirements/req1.md"]).toBe(
        "string",
      );
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "re-imports only changed file hashes",
    async () => {
      execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      writeFileSync(
        path.join(tmpDir, "requirements", "req1.md"),
        `---
title: User Authentication Updated
type: req
status: approved
tags: [security, auth]
owner: alice
links:
  - type: relates_to
    target: scenario1
---

# User Authentication

System must support OAuth2 authentication with session renewal.
`,
      );

      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const match = output.match(
        /Imported (\d+) entities, (\d+) relationships/,
      );
      expect(match).toBeDefined();
      if (!match) throw new Error("Output format mismatch");

      const entityCount = Number.parseInt(match[1]);
      expect(entityCount).toBeGreaterThanOrEqual(1);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "handles missing paths gracefully",
    async () => {
      // Add non-existent path to config
      const configPath = path.join(tmpDir, ".kb/config.json");
      const config = JSON.parse(readFileSync(configPath, "utf8"));
      config.paths.nonexistent = "nonexistent/**/*.md";
      writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Should warn but not crash
      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(output).toContain("Imported");
      // No error exit code
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "extracts relationships from links",
    async () => {
      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(output).toMatch(/\d+ entities, \d+ relationships/);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "reports entity and relationship counts",
    async () => {
      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(output).toMatch(/Imported \d+ entities, \d+ relationships/);

      const match = output.match(
        /Imported (\d+) entities, (\d+) relationships/,
      );
      expect(match).toBeDefined();

      if (!match) throw new Error("Output format mismatch");

      const entityCount = Number.parseInt(match[1]);
      const relCount = Number.parseInt(match[2]);

      expect(entityCount).toBeGreaterThanOrEqual(0);
      expect(relCount).toBeGreaterThanOrEqual(0);
    },
    TEST_TIMEOUT_MS,
  );

  describe("validate-only mode", () => {
    test(
      "validate-only does not modify output artifacts",
      async () => {
        const currentBranch =
          execSync("git branch --show-current", {
            cwd: tmpDir,
            encoding: "utf8",
          }).trim() || "main";
        const effectiveBranch =
          currentBranch === "master" ? "main" : currentBranch;
        const kbPath = path.join(tmpDir, `.kb/branches/${effectiveBranch}`);
        const rdfPath = path.join(kbPath, "kb.rdf");

        if (existsSync(rdfPath)) {
          rmSync(rdfPath);
        }

        const output = execSync(`bun ${kibiBin} sync --validate-only`, {
          cwd: tmpDir,
          encoding: "utf8",
        });

        expect(output).toContain("OK: Validation passed");
        expect(existsSync(rdfPath)).toBe(false);

        const cachePath = path.join(kbPath, "sync-cache.json");
        expect(existsSync(cachePath)).toBe(false);
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "validate-only returns non-zero on errors",
      async () => {
        writeFileSync(
          path.join(tmpDir, "requirements", "invalid.md"),
          `---
invalid: yaml: [
---
`,
        );

        try {
          execSync(`bun ${kibiBin} sync --validate-only`, {
            cwd: tmpDir,
            encoding: "utf8",
            stdio: "pipe",
          });
          throw new Error("Should have failed");
        } catch (error: any) {
          expect(error.status).toBe(1);
          const stderr = error.stderr.toString();
          expect(stderr).toContain("invalid.md");
          expect(stderr).toContain("FAILED");
        }
      },
      TEST_TIMEOUT_MS,
    );
  });
});
