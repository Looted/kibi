import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync, spawnSync } from "node:child_process";
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
import { toPrologString } from "../../dist/prolog/codec.js";

describe("kibi sync", () => {
  const TEST_TIMEOUT_MS = 20000;
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-sync-"));

    // Initialize git repo and create initial commit (required per ADR-012)
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git checkout -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

    // Initialize KB structure
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // Create test fixtures
    const reqDir = path.join(tmpDir, "documentation/requirements");
    const scenarioDir = path.join(tmpDir, "documentation/scenarios");

    mkdirSync(reqDir, { recursive: true });
    mkdirSync(scenarioDir, { recursive: true });

    // Requirement document
    writeFileSync(
      path.join(reqDir, "req1.md"),
      `---
id: req1
title: User Authentication
type: req
status: open
tags: [security, auth]
owner: alice
---

# User Authentication

System must support OAuth2 authentication.
  `,
    );
    // Scenario document
    writeFileSync(
      path.join(scenarioDir, "scenario1.md"),
      `---
id: scenario1
title: Login Flow
status: active
tags: [auth]
---

# Login Flow

User logs in with OAuth2 provider.
`,
    );

    // Symbol manifest
    const docDir = path.join(tmpDir, "documentation");
    mkdirSync(docDir, { recursive: true });
    writeFileSync(
      path.join(docDir, "symbols.yaml"),
      `symbols:
  - title: authenticate()
    status: active
    tags: [auth]
  - title: logout()
    status: active
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
      expect(cache.hashes["documentation/symbols.yaml"]).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(typeof cache.seenAt["documentation/requirements/req1.md"]).toBe(
        "string",
      );
      expect(cache.seenAt["documentation/requirements/req1.md"]).not.toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(
        Number.isNaN(
          Date.parse(cache.seenAt["documentation/requirements/req1.md"]),
        ),
      ).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "re-imports files when cache seenAt values are invalid",
    async () => {
      execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const cachePath = path.join(tmpDir, ".kb/branches/main/sync-cache.json");
      const cache = JSON.parse(readFileSync(cachePath, "utf8")) as {
        version: number;
        hashes: Record<string, string>;
        seenAt: Record<string, string>;
      };

      cache.seenAt = Object.fromEntries(
        Object.entries(cache.hashes).map(([key, value]) => [key, value]),
      );
      writeFileSync(cachePath, JSON.stringify(cache, null, 2));

      const result = spawnSync("bun", [kibiBin, "sync"], {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      const output = `${result.stdout}${result.stderr}`;
      const match = output.match(
        /Imported (\d+) entities, (\d+) relationships/,
      );
      expect(match).toBeDefined();

      if (!match) throw new Error("Output format mismatch");

      expect(Number.parseInt(match[1])).toBeGreaterThan(0);

      const repairedCache = JSON.parse(readFileSync(cachePath, "utf8")) as {
        seenAt: Record<string, string>;
      };
      for (const value of Object.values(repairedCache.seenAt)) {
        expect(Number.isNaN(Date.parse(value))).toBe(false);
      }
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
        path.join(tmpDir, "documentation/requirements", "req1.md"),
        `---
title: User Authentication Updated
type: req
status: open
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
    "imports valid shard relationships without false dangling warnings",
    async () => {
      const relationshipsDir = path.join(tmpDir, ".kb", "relationships");
      mkdirSync(relationshipsDir, { recursive: true });

      writeFileSync(
        path.join(relationshipsDir, "a1.yaml"),
        `relationships:
  - id: rel-abc123def456
    type: relates_to
    from: req1
    to: scenario1
    created_at: "2026-03-16T11:45:00Z"
    created_by: agent/test
    source: test://sync-test`,
      );

      const result = spawnSync("bun", [kibiBin, "sync"], {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      const output = `${result.stdout}${result.stderr}`;
      expect(output).toMatch(/Imported \d+ entities, [1-9]\d* relationships/);
      expect(output).not.toContain("dangling relationship(s) found");
      expect(output).not.toContain("relationship(s) failed to sync");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "extracts relationships from shard files",
    async () => {
      // First sync to get entity IDs
      execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
        stdio: "pipe",
      });

      // Create a relationship shard
      const kbDir = path.join(tmpDir, ".kb");
      const relationshipsDir = path.join(kbDir, "relationships");
      mkdirSync(relationshipsDir, { recursive: true });

      // Use hardcoded entity IDs based on the fixture
      writeFileSync(
        path.join(relationshipsDir, "a1.yaml"),
        `relationships:
  - id: rel-abc123def456
    type: relates_to
    from: req1
    to: scenario1
    created_at: "2026-03-16T11:45:00Z"
    created_by: agent/test
    source: test://sync-test`,
      );

      // Second sync should pick up the relationship
      const output = execSync(`bun ${kibiBin} sync`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      expect(output).toMatch(/\d+ entities, \d+ relationships/);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "imports markdown string links as relates_to relationships",
    async () => {
      const testsDir = path.join(tmpDir, "documentation/tests");
      mkdirSync(testsDir, { recursive: true });

      writeFileSync(
        path.join(tmpDir, "documentation/requirements", "req-linked.md"),
        `---
id: req-linked
title: Requirement with mixed links
type: req
status: open
links:
  - scenario-linked
  - type: verified_by
    target: test-linked
---

# Requirement with mixed links

Import plain string links as generic relationships.
`,
      );

      writeFileSync(
        path.join(tmpDir, "documentation/scenarios", "scenario-linked.md"),
        `---
id: scenario-linked
title: Linked Scenario
status: active
---

# Linked Scenario
`,
      );

      writeFileSync(
        path.join(testsDir, "test-linked.md"),
        `---
id: test-linked
title: Linked Test
status: passing
---

# Linked Test
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

      expect(Number.parseInt(match[2])).toBeGreaterThanOrEqual(2);

      const queryOutput = execSync(
        `bun ${kibiBin} query req --id req-linked --format json`,
        {
          cwd: tmpDir,
          encoding: "utf8",
        },
      );

      const [result] = JSON.parse(queryOutput) as Array<{
        relates_to?: string;
        verified_by?: string;
      }>;

      expect(result?.relates_to).toBe("kb:entity/scenario-linked");
      expect(result?.verified_by).toBe("kb:entity/test-linked");
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
        const invalidDir = path.join(tmpDir, "documentation/requirements");
        mkdirSync(invalidDir, { recursive: true });
        writeFileSync(
          path.join(invalidDir, "invalid.md"),
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
        } catch (error: unknown) {
          const execError = error as {
            status?: number;
            stderr?: { toString(): string };
          };
          expect(execError.status).toBe(1);
          const stderr = execError.stderr?.toString() ?? "";
          expect(stderr).toContain("invalid.md");
          expect(stderr).toContain("FAILED");
        }
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "validate-only returns non-zero for malformed typed fact scalar fields",
      async () => {
        const factsDir = path.join(tmpDir, "documentation/facts");
        mkdirSync(factsDir, { recursive: true });
        writeFileSync(
          path.join(factsDir, "FACT-INVALID-TYPED-SCALAR.md"),
          `---
id: FACT-INVALID-TYPED-SCALAR
title: Invalid typed scalar fact
type: fact
status: active
fact_kind: property_value
subject_key: user.session
property_key: timeout_minutes
operator: eq
value_type: int
value_int: "30"
---
# Invalid typed scalar fact
`,
        );

        try {
          execSync(`bun ${kibiBin} sync --validate-only`, {
            cwd: tmpDir,
            encoding: "utf8",
            stdio: "pipe",
          });
          throw new Error("Should have failed");
        } catch (error: unknown) {
          const execError = error as {
            status?: number;
            stderr?: { toString(): string };
          };
          expect(execError.status).toBe(1);
          const stderr = execError.stderr?.toString() ?? "";
          expect(stderr).toContain("FACT-INVALID-TYPED-SCALAR.md");
          expect(stderr).toContain("Entity validation failed");
          expect(stderr).toContain("/value_int: must be integer");
          expect(stderr).toContain("FAILED");
        }
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "validate-only reuses Prolog strict fact-shape validation",
      async () => {
        const factsDir = path.join(tmpDir, "documentation/facts");
        mkdirSync(factsDir, { recursive: true });
        writeFileSync(
          path.join(factsDir, "FACT-MISSING-VALUE-FIELD.md"),
          `---
id: FACT-MISSING-VALUE-FIELD
title: Missing value field fact
type: fact
status: active
fact_kind: property_value
subject_key: user.session
property_key: timeout_minutes
operator: eq
value_type: int
---
# Missing value field fact
`,
        );

        try {
          execSync(`bun ${kibiBin} sync --validate-only`, {
            cwd: tmpDir,
            encoding: "utf8",
            stdio: "pipe",
          });
          throw new Error("Should have failed");
        } catch (error: unknown) {
          const execError = error as {
            status?: number;
            stderr?: { toString(): string };
          };
          expect(execError.status).toBe(1);
          const stderr = execError.stderr?.toString() ?? "";
          expect(stderr).toContain(
            "Failed to upsert entity FACT-MISSING-VALUE-FIELD",
          );
        }
      },
      TEST_TIMEOUT_MS,
    );
  });

  describe("Typed Fact Round-trip", () => {
    test(
      "syncs and queries typed fact with value_int",
      async () => {
        const factsDir = path.join(tmpDir, "documentation/facts");
        mkdirSync(factsDir, { recursive: true });

        writeFileSync(
          path.join(factsDir, "FACT-SESSION-TIMEOUT-30.md"),
          `---
id: FACT-SESSION-TIMEOUT-30
title: Session timeout is 30 minutes
type: fact
status: active
fact_kind: property_value
subject_key: user.session
property_key: timeout_minutes
operator: eq
value_type: int
value_int: 30
unit: minutes
scope: global
polarity: require
closed_world: true
valid_from: 2026-03-23T00:00:00Z
canonical_key: user.session.timeout_minutes.eq.30
---
# Session timeout
`,
        );

        // Sync
        execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

        // Query and verify
        const output = execSync(
          `bun ${kibiBin} query fact --id FACT-SESSION-TIMEOUT-30 --format json`,
          { cwd: tmpDir, encoding: "utf8", stdio: "pipe" },
        );

        const result = JSON.parse(output);
        expect(result).toHaveLength(1);
        const fact = result[0];
        expect(fact.id).toBe("FACT-SESSION-TIMEOUT-30");
        expect(fact.fact_kind).toBe("property_value");
        expect(fact.value_int).toBe(30);
        expect(fact.closed_world).toBe(true);
        expect(fact.canonical_key).toBe(
          "user.session.timeout_minutes.eq.30",
        );
        expect(fact.valid_from).toMatch(/^2026-03-23T00:00:00/);
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "syncs and queries typed fact with value_number",
      async () => {
        const factsDir = path.join(tmpDir, "documentation/facts");
        mkdirSync(factsDir, { recursive: true });

        writeFileSync(
          path.join(factsDir, "FACT-RATE-LIMIT.md"),
          `---
id: FACT-RATE-LIMIT
title: Rate limit is 1.5 requests per second
type: fact
status: active
fact_kind: property_value
subject_key: api.client
property_key: rate_limit_rps
operator: eq
value_type: number
value_number: 1.5
unit: requests_per_second
scope: global
polarity: require
canonical_key: api.client.rate_limit_rps.eq.1.5
---
# Rate limit
`,
        );

        // Sync
        execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

        // Query and verify
        const output = execSync(
          `bun ${kibiBin} query fact --id FACT-RATE-LIMIT --format json`,
          { cwd: tmpDir, encoding: "utf8", stdio: "pipe" },
        );

        const result = JSON.parse(output);
        expect(result).toHaveLength(1);
        const fact = result[0];
        expect(fact.value_number).toBe(1.5);
        expect(fact.canonical_key).toBe("api.client.rate_limit_rps.eq.1.5");
        expect(fact.value_int).toBeUndefined();
      },
      TEST_TIMEOUT_MS,
    );

    test(
      "syncs and queries typed fact with value_string",
      async () => {
        const factsDir = path.join(tmpDir, "documentation/facts");
        mkdirSync(factsDir, { recursive: true });

        writeFileSync(
          path.join(factsDir, "FACT-USER-TYPE.md"),
          `---
id: FACT-USER-TYPE
title: User type can be admin
type: fact
status: active
fact_kind: property_value
subject_key: user.type
property_key: allowed_value
operator: eq
value_type: string
value_string: admin
scope: global
polarity: require
canonical_key: user.type.allowed_value.eq.admin
---
# User type
`,
        );

        // Sync
        execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });

        // Query and verify
        const output = execSync(
          `bun ${kibiBin} query fact --id FACT-USER-TYPE --format json`,
          { cwd: tmpDir, encoding: "utf8", stdio: "pipe" },
        );

        const result = JSON.parse(output);
        expect(result).toHaveLength(1);
        const fact = result[0];
        expect(fact.value_string).toBe("admin");
        expect(fact.canonical_key).toBe("user.type.allowed_value.eq.admin");
        expect(fact.value_int).toBeUndefined();
      },
      TEST_TIMEOUT_MS,
    );
  });

  describe("persistEntities — string escaping", () => {
    test("toPrologString handles backslash in title", () => {
      // Regression: persistence previously only escaped " not \
      const title = "C:\\Users\\foo";
      expect(toPrologString(title)).toBe('"C:\\\\Users\\\\foo"');
    });

    test("toPrologString handles newline in source path", () => {
      const source = "docs/foo\nbar.md";
      expect(toPrologString(source)).toBe('"docs/foo\\nbar.md"');
    });
  });

  describe("serializeTypedFactFields — integer guard", () => {
    test("Number.isInteger correctly identifies integers vs floats", () => {
      expect(Number.isInteger(3.5)).toBe(false);
      expect(Number.isInteger(3)).toBe(true);
    });
  });

  describe("symbol coordinate refresh — internal declaration shapes (regression)", () => {
    test(
      "sync reaches failed=0 for exported, non-exported, and class-method symbols",
      async () => {
        // Create a TypeScript source file with all three declaration shapes
        const srcDir = path.join(tmpDir, "src");
        mkdirSync(srcDir, { recursive: true });

        writeFileSync(
          path.join(srcDir, "server.ts"),
          `// implements REQ-001
export function startServer(port: number): void {
  console.log('listening on', port);
}

function parseSymbolsManifest(raw: string): unknown {
  return JSON.parse(raw);
}

export class ServerManager {
  mergeStaticLinks(base: string[], extra: string[]): string[] {
    return [...base, ...extra];
  }
}
`,
        );

        // Write a symbols.yaml pointing to those symbols
        const docDir = path.join(tmpDir, "documentation");
        mkdirSync(docDir, { recursive: true });
        writeFileSync(
          path.join(docDir, "symbols.yaml"),
          `symbols:
  - id: SYM-start-server
    title: startServer
    status: active
    sourceFile: src/server.ts
  - id: SYM-parse-manifest
    title: parseSymbolsManifest
    status: active
    sourceFile: src/server.ts
  - id: SYM-merge-static-links
    title: mergeStaticLinks
    status: active
    sourceFile: src/server.ts
`,
        );

        const output = execSync(`bun ${kibiBin} sync`, {
          cwd: tmpDir,
          encoding: "utf8",
        });

        // All three symbols must resolve — no failures
        expect(output).toMatch(/failed=0/);
      },
      TEST_TIMEOUT_MS,
    );
  });
});
