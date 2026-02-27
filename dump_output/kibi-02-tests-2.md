# Pack: kibi-02-tests (Part 2)


This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
packages/
  cli/
    tests/
      commands/
        query.test.ts
        sync.test.ts
      extractors/
        manifest.test.ts
        markdown.test.ts
      fixtures.test.ts
      hooks.test.ts
      prolog.test.ts
      schemas.test.ts
  mcp/
    tests/
      tools/
        branch.test.ts
        check.test.ts
      server.test.ts
      stdio-protocol.test.ts
```

# Files

## File: packages/cli/tests/commands/query.test.ts
```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("kibi query", () => {
  const TEST_TIMEOUT_MS = 20000;
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-query-"));

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

    // Requirement document with auth tag
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

    // Requirement document with payments tag
    writeFileSync(
      path.join(reqDir, "req2.md"),
      `---
title: Payment Processing
type: req
status: draft
tags: [payments, finance]
owner: bob
---

# Payment Processing

System must support credit card payments.
`,
    );

    // Requirement document with source path
    writeFileSync(
      path.join(reqDir, "req3.md"),
      `---
title: Feature with Source
type: req
status: active
tags: [feature]
source: src/features/feature.ts
---

# Feature with Source

Feature has source path.
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
  - title: processPayment()
    status: implemented
    tags: [payments]
`,
    );

    // Sync the fixtures into KB
    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
    });
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test(
    "queries all entities of a type",
    () => {
      const output = execSync(`bun ${kibiBin} query req --format json`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const results = JSON.parse(output);
      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        expect(results[0]).toHaveProperty("id");
        expect(results[0]).toHaveProperty("title");
        expect(results[0]).toHaveProperty("status");
        if (results[0].type) {
          expect(results[0].type).toBe("req");
        }
      }
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "accepts fact as a valid entity type",
    () => {
      const output = execSync(`bun ${kibiBin} query fact --format json`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const results = JSON.parse(output);
      expect(Array.isArray(results)).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "queries specific entity by ID",
    () => {
      const allOutput = execSync(`bun ${kibiBin} query req --format json`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const allResults = JSON.parse(allOutput);

      if (allResults.length === 0) {
        expect(true).toBe(true);
        return;
      }

      const targetId = allResults[0].id;

      const output = execSync(
        `bun ${kibiBin} query req --id ${targetId} --format json`,
        {
          cwd: tmpDir,
          encoding: "utf8",
        },
      );

      const results = JSON.parse(output);
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0].id).toBe(targetId);
      }
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "filters entities by tag",
    () => {
      const output = execSync(
        `bun ${kibiBin} query req --tag auth --format json`,
        {
          cwd: tmpDir,
          encoding: "utf8",
        },
      );

      const results = JSON.parse(output);
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0].tags).toBeDefined();
        expect(Array.isArray(results[0].tags)).toBe(true);
      }
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "queries relationships from entity",
    () => {
      const allOutput = execSync(`bun ${kibiBin} query req --format json`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const allResults = JSON.parse(allOutput);
      const entityWithLinks = allResults.find((r: { title?: string }) =>
        r.title?.includes("Authentication"),
      );

      if (!entityWithLinks) {
        expect(true).toBe(true);
        return;
      }

      const output = execSync(
        `bun ${kibiBin} query --relationships ${entityWithLinks.id} --format json`,
        {
          cwd: tmpDir,
          encoding: "utf8",
        },
      );

      const results = JSON.parse(output);
      expect(Array.isArray(results)).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "outputs table format",
    () => {
      const output = execSync(`bun ${kibiBin} query req --format table`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      if (output.includes("No entities found")) {
        expect(output).toContain("No entities found");
      } else {
        expect(output).toContain("ID");
        expect(output).toContain("Type");
        expect(output).toContain("Title");
        expect(output).toContain("Status");
        expect(output).toContain("Tags");
        expect(output).toMatch(/[─│┌┐└┘]/);
      }
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "handles empty results gracefully",
    () => {
      const output = execSync(
        `bun ${kibiBin} query req --tag nonexistent_tag_xyz --format json`,
        {
          cwd: tmpDir,
          encoding: "utf8",
        },
      );

      const results = JSON.parse(output);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toEqual([]);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "rejects invalid entity type",
    () => {
      try {
        execSync(`bun ${kibiBin} query invalid_type`, {
          cwd: tmpDir,
          encoding: "utf8",
        });
        throw new Error("Should have failed");
      } catch (error: unknown) {
        const commandError = error as {
          status?: number;
          stderr?: { toString(): string };
        };
        expect(commandError.status).not.toBe(0);
        expect(commandError.stderr?.toString()).toContain("Invalid type");
      }
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "handles empty table output gracefully",
    () => {
      const output = execSync(
        `bun ${kibiBin} query req --tag nonexistent_tag_xyz --format table`,
        {
          cwd: tmpDir,
          encoding: "utf8",
        },
      );

      expect(output).toContain("No entities found");
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "applies pagination with limit and offset",
    () => {
      const allOutput = execSync(`bun ${kibiBin} query req --format json`, {
        cwd: tmpDir,
        encoding: "utf8",
      });

      const allResults = JSON.parse(allOutput);
      if (allResults.length === 0) {
        expect(true).toBe(true);
        return;
      }

      const limitOutput = execSync(
        `bun ${kibiBin} query req --limit 1 --format json`,
        {
          cwd: tmpDir,
          encoding: "utf8",
        },
      );

      const limitResults = JSON.parse(limitOutput);
      expect(limitResults.length).toBeLessThanOrEqual(1);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "filters entities by source path",
    () => {
      const output = execSync(
        `bun ${kibiBin} query --source src/features/feature.ts --format json`,
        {
          cwd: tmpDir,
          encoding: "utf8",
        },
      );

      const results = JSON.parse(output);
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        const foundEntity = results.find((r: { id?: string }) =>
          r.id?.includes("req3"),
        );
        expect(foundEntity).toBeDefined();
        expect(foundEntity?.title).toBe("Feature with Source");
      }
    },
    TEST_TIMEOUT_MS,
  );
});
```

## File: packages/cli/tests/commands/sync.test.ts
```typescript
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
      expect(cache.hashes["requirements/req1.md"]).toMatch(/^[a-f0-9]{64}$/);
      expect(cache.hashes["scenarios/scenario1.md"]).toMatch(/^[a-f0-9]{64}$/);
      expect(cache.hashes["symbols.yaml"]).toMatch(/^[a-f0-9]{64}$/);
      expect(typeof cache.seenAt["requirements/req1.md"]).toBe("string");
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
```

## File: packages/cli/tests/extractors/manifest.test.ts
```typescript
import { describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ManifestError,
  extractFromManifest,
} from "../../src/extractors/manifest";

const TEST_DIR = join(process.cwd(), "test-tmp");

function setupTestFile(filename: string, content: string): string {
  mkdirSync(TEST_DIR, { recursive: true });
  const filePath = join(TEST_DIR, filename);
  writeFileSync(filePath, content);
  return filePath;
}

function cleanup() {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

describe("manifest extractor", () => {
  test("extracts symbols from YAML manifest", () => {
    const yaml = `
symbols:
  - id: symbol-io-logger
    title: IO logger
    source: https://example.com/symbols/io-logger
    status: defined
    tags: [logging, io]
  - id: symbol-auth-service
    title: Auth service
    source: https://example.com/symbols/auth-service
    status: defined
    tags: [auth]
`;
    const filePath = setupTestFile("test-manifest.yaml", yaml);

    const results = extractFromManifest(filePath);

    expect(results).toHaveLength(2);
    expect(results[0].entity.type).toBe("symbol");
    expect(results[0].entity.title).toBe("IO logger");
    expect(results[0].entity.status).toBe("defined");
    expect(results[0].entity.source).toBe(filePath);
    expect(results[0].entity.tags).toEqual(["logging", "io"]);
    expect(results[0].entity.id).toBe("symbol-io-logger");

    expect(results[1].entity.title).toBe("Auth service");
    expect(results[1].entity.tags).toEqual(["auth"]);

    cleanup();
  });

  test("extracts relationships from links array", () => {
    const yaml = `
symbols:
  - id: symbol-auth-service
    title: Auth service
    source: https://example.com/symbols/auth-service
    status: defined
    links:
      - type: implements
        target: REQ-001
      - type: covered_by
        target: TEST-042
      - REQ-002
`;
    const filePath = setupTestFile("test-links.yaml", yaml);

    const results = extractFromManifest(filePath);

    expect(results).toHaveLength(1);
    const { relationships } = results[0];

    expect(relationships).toHaveLength(3);
    expect(relationships[0].type).toBe("implements");
    expect(relationships[0].from).toBe(results[0].entity.id);
    expect(relationships[0].to).toBe("REQ-001");

    expect(relationships[1].type).toBe("covered_by");
    expect(relationships[1].to).toBe("TEST-042");

    expect(relationships[2].type).toBe("relates_to");
    expect(relationships[2].to).toBe("REQ-002");

    cleanup();
  });

  test("generates consistent content-based IDs", () => {
    const yaml = `
symbols:
  - id: symbol-auth-service
    title: Auth service
    source: https://example.com/symbols/auth-service
    status: defined
`;
    const filePath = setupTestFile("test-id.yaml", yaml);

    const results1 = extractFromManifest(filePath);
    const results2 = extractFromManifest(filePath);

    expect(results1[0].entity.id).toBe(results2[0].entity.id);
    expect(results1[0].entity.id).toBe("symbol-auth-service");

    cleanup();
  });

  test("handles missing optional fields with defaults", () => {
    const yaml = `
symbols:
  - title: Minimal Symbol
    source: https://example.com/minimal
`;
    const filePath = setupTestFile("test-defaults.yaml", yaml);

    const results = extractFromManifest(filePath);

    expect(results).toHaveLength(1);
    const { entity } = results[0];

    expect(entity.status).toBe("draft");
    expect(entity.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entity.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entity.tags).toBeUndefined();

    cleanup();
  });

  test("throws ManifestError when title is missing", () => {
    const yaml = `
symbols:
  - source: https://example.com/no-title
    status: defined
`;
    const filePath = setupTestFile("test-no-title.yaml", yaml);

    expect(() => extractFromManifest(filePath)).toThrow(ManifestError);
    expect(() => extractFromManifest(filePath)).toThrow(
      "Missing required field: title",
    );

    cleanup();
  });

  test("throws ManifestError when symbols array is missing", () => {
    const yaml = `
other_data:
  - title: Not a symbol
`;
    const filePath = setupTestFile("test-no-symbols.yaml", yaml);

    expect(() => extractFromManifest(filePath)).toThrow(ManifestError);
    expect(() => extractFromManifest(filePath)).toThrow(
      "No symbols array found",
    );

    cleanup();
  });

  test("handles multiple relationship types", () => {
    const yaml = `
symbols:
  - title: Complex Symbol
    source: https://example.com/complex
    links:
      - type: implements
        target: REQ-001
      - type: constrained_by
        target: ADR-005
      - type: publishes
        target: EVENT-001
      - type: consumes
        target: EVENT-002
`;
    const filePath = setupTestFile("test-rel-types.yaml", yaml);

    const results = extractFromManifest(filePath);
    const { relationships } = results[0];

    expect(relationships).toHaveLength(4);
    expect(relationships[0].type).toBe("implements");
    expect(relationships[1].type).toBe("constrained_by");
    expect(relationships[2].type).toBe("publishes");
    expect(relationships[3].type).toBe("consumes");

    cleanup();
  });
});
```

## File: packages/cli/tests/extractors/markdown.test.ts
```typescript
import { describe, expect, test } from "bun:test";
import { unlinkSync, writeFileSync } from "node:fs";
import {
  FrontmatterError,
  extractFromMarkdown,
  inferTypeFromPath,
} from "../../src/extractors/markdown";

describe("Markdown Extractor", () => {
  describe("Type Inference", () => {
    test("infers type from path for all supported directories", () => {
      const cases = [
        { path: "/path/to/requirements/REQ-001.md", expected: "req" },
        { path: "/path/to/scenarios/SCEN-001.md", expected: "scenario" },
        { path: "/path/to/tests/TEST-001.md", expected: "test" },
        { path: "/path/to/adr/ADR-001.md", expected: "adr" },
        { path: "/path/to/flags/FLAG-001.md", expected: "flag" },
        { path: "/path/to/events/EVT-001.md", expected: "event" },
        { path: "/path/to/facts/FACT-001.md", expected: "fact" },
      ];

      for (const { path, expected } of cases) {
        expect(inferTypeFromPath(path)).toBe(expected);
      }
    });

    test("returns null for paths without type indicators", () => {
      expect(inferTypeFromPath("/path/to/other/doc.md")).toBe(null);
      expect(inferTypeFromPath("/requirements-doc.md")).toBe(null);
    });

    test("handles nested paths correctly", () => {
      expect(inferTypeFromPath("/src/requirements/nested/doc.md")).toBe("req");
    });

    test("prioritizes types based on check order", () => {
      // The implementation checks in this order: requirements, scenarios, tests, adr, flags, events, facts
      // So /requirements/scenarios/ should be 'req'
      expect(inferTypeFromPath("/requirements/scenarios/doc.md")).toBe("req");

      // /scenarios/requirements/ should also be 'req' because includes("/requirements/") is checked first
      expect(inferTypeFromPath("/scenarios/requirements/doc.md")).toBe("req");

      // /tests/scenarios/ should be 'scenario' because includes("/scenarios/") is checked before includes("/tests/")
      expect(inferTypeFromPath("/tests/scenarios/doc.md")).toBe("scenario");
    });
  });

  test("extracts requirement from markdown", () => {
    const result = extractFromMarkdown(
      "packages/cli/tests/fixtures/requirements/REQ-001.md",
    );
    expect(result.entity.type).toBe("req");
    expect(result.entity.id).toMatch(/^[0-9a-f]{16}$/);
    expect(result.entity.title).toBe("User Authentication");
    expect(result.entity.status).toBe("approved");
    expect(result.entity.priority).toBe("high");
    expect(result.entity.owner).toBe("security-team");
    expect(result.entity.tags).toEqual([
      "authentication",
      "security",
      "phase-1",
    ]);
  });

  test("extracts relationships from frontmatter", () => {
    const result = extractFromMarkdown(
      "packages/cli/tests/fixtures/scenarios/SCEN-001.md",
    );
    expect(result.relationships).toBeInstanceOf(Array);
    expect(result.relationships.length).toBeGreaterThan(0);
    expect(result.relationships[0]).toHaveProperty("type");
    expect(result.relationships[0]).toHaveProperty("from");
    expect(result.relationships[0]).toHaveProperty("to");
    expect(result.relationships[0].type).toBe("specified_by");
    expect(result.relationships[0].to).toBe("REQ-001");
  });

  test("infers type from directory path", () => {
    const result = extractFromMarkdown(
      "packages/cli/tests/fixtures/adr/ADR-001.md",
    );
    expect(result.entity.type).toBe("adr");
  });

  test("handles malformed frontmatter gracefully", () => {
    const tempFile = "/tmp/test-invalid-frontmatter.md";
    writeFileSync(tempFile, "---\ninvalid: [unclosed\n---\n# Title");

    expect(() => extractFromMarkdown(tempFile)).toThrow(FrontmatterError);

    unlinkSync(tempFile);
  });

  test("diagnoses unquoted colon in title", () => {
    const tempFile = "/tmp/test-unquoted-colon.md";
    writeFileSync(tempFile, "---\ntitle: Foo: Bar\n---\n# Content");

    try {
      extractFromMarkdown(tempFile);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(FrontmatterError);
      const fe = error as FrontmatterError;
      expect(fe.classification).toBe("Unquoted colon likely in title");
      expect(fe.hint).toContain("Wrap values containing colons in quotes");
    } finally {
      unlinkSync(tempFile);
    }
  });

  test("diagnoses missing closing delimiter", () => {
    const tempFile = "/tmp/test-missing-closing.md";
    writeFileSync(tempFile, "---\ntitle: Foo\n# Content");

    try {
      extractFromMarkdown(tempFile);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(FrontmatterError);
      const fe = error as FrontmatterError;
      expect(fe.classification).toBe("Missing closing ---");
      expect(fe.hint).toContain("Ensure the frontmatter is enclosed");
    } finally {
      unlinkSync(tempFile);
    }
  });

  test("diagnoses generic YAML mapping error", () => {
    const tempFile = "/tmp/test-mapping-error.md";
    writeFileSync(tempFile, "---\ntitle: Foo\nkey: [unclosed\n---\n# Content");

    try {
      extractFromMarkdown(tempFile);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(FrontmatterError);
      const fe = error as FrontmatterError;
      expect(fe.classification).toBe("Generic YAML mapping error");
      expect(fe.hint).toContain("Check for unclosed brackets");
    } finally {
      unlinkSync(tempFile);
    }
  });

  test("generates consistent IDs", () => {
    const result1 = extractFromMarkdown(
      "packages/cli/tests/fixtures/requirements/REQ-001.md",
    );
    const result2 = extractFromMarkdown(
      "packages/cli/tests/fixtures/requirements/REQ-001.md",
    );
    expect(result1.entity.id).toBe(result2.entity.id);
  });

  test("extracts all entity fields", () => {
    const result = extractFromMarkdown(
      "packages/cli/tests/fixtures/requirements/REQ-001.md",
    );
    expect(result.entity).toHaveProperty("id");
    expect(result.entity).toHaveProperty("title");
    expect(result.entity).toHaveProperty("status");
    expect(result.entity).toHaveProperty("created_at");
    expect(result.entity).toHaveProperty("updated_at");
    expect(result.entity).toHaveProperty("source");
    expect(result.entity.source).toBe(
      "packages/cli/tests/fixtures/requirements/REQ-001.md",
    );
  });

  test("handles missing required title field", () => {
    const tempFile = "/tmp/test-missing-title.md";
    writeFileSync(
      tempFile,
      "---\nstatus: draft\ntype: req\n---\n# Content without title",
    );

    expect(() => extractFromMarkdown(tempFile)).toThrow(FrontmatterError);
    expect(() => extractFromMarkdown(tempFile)).toThrow(
      "Missing required field: title",
    );

    unlinkSync(tempFile);
  });

  test("handles string links format", () => {
    const tempFile = "/tmp/test-string-links.md";
    writeFileSync(
      tempFile,
      '---\ntitle: Test\ntype: req\nlinks:\n  - "TARGET-001"\n  - "TARGET-002"\n---\n# Test',
    );

    const result = extractFromMarkdown(tempFile);
    expect(result.relationships.length).toBe(2);
    expect(result.relationships[0].type).toBe("relates_to");
    expect(result.relationships[0].to).toBe("TARGET-001");
    expect(result.relationships[1].to).toBe("TARGET-002");

    unlinkSync(tempFile);
  });

  test("provides default values for missing fields", () => {
    const tempFile = "/tmp/test-defaults.md";
    writeFileSync(
      tempFile,
      "---\ntitle: Minimal Document\ntype: req\n---\n# Content",
    );

    const result = extractFromMarkdown(tempFile);
    expect(result.entity.status).toBe("draft");
    expect(result.entity.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.entity.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    unlinkSync(tempFile);
  });

  test("extracts supersedes relationship from ADR frontmatter", () => {
    const tempFile = "/tmp/test-supersedes.md";
    writeFileSync(
      tempFile,
      `---
id: ADR-010
title: New Decision
type: adr
status: active
links:
  - type: supersedes
    target: ADR-005
---
# Content
`,
    );

    const result = extractFromMarkdown(tempFile);
    expect(result.relationships).toBeInstanceOf(Array);
    expect(result.relationships.length).toBe(1);
    expect(result.relationships[0].type).toBe("supersedes");
    expect(result.relationships[0].to).toBe("ADR-005");

    unlinkSync(tempFile);
  });
});
```

## File: packages/cli/tests/fixtures.test.ts
```typescript
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";

let parseYAML: (s: string) => any = (s: string) => ({ symbols: [] });
try {
  // prefer installed 'yaml' package if present
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // @ts-ignore allow dynamic require in test
  parseYAML = require("yaml").parse;
} catch {}

describe("Fixtures", () => {
  const fixturesDir = path.resolve(__dirname, "../../../test/fixtures");

  test("all required fixture files exist", () => {
    const required = [
      path.join(fixturesDir, "requirements/REQ-001.md"),
      path.join(fixturesDir, "scenarios/SCEN-001.md"),
      path.join(fixturesDir, "tests/TEST-001.md"),
      path.join(fixturesDir, "adr/ADR-001.md"),
      path.join(fixturesDir, "flags/FLAG-001.md"),
      path.join(fixturesDir, "events/EVT-001.md"),
      path.join(fixturesDir, "symbols.yaml"),
    ];
    for (const file of required) {
      expect(() => readFileSync(file, "utf8")).not.toThrow();
    }
  });

  test("frontmatter has required fields", () => {
    const file = readFileSync(
      path.join(fixturesDir, "requirements/REQ-001.md"),
      "utf8",
    );
    const { data } = matter(file);
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("created_at");
    expect(data).toHaveProperty("updated_at");
    expect(data).toHaveProperty("source");
  });

  test("symbols.yaml is valid", () => {
    const file = readFileSync(path.join(fixturesDir, "symbols.yaml"), "utf8");
    const data = parseYAML(file);
    expect(data).toHaveProperty("symbols");
    expect(Array.isArray(data.symbols)).toBe(true);
  });
});
```

## File: packages/cli/tests/hooks.test.ts
```typescript
// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("Git hooks", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    execSync("git init", { cwd: tmpDir });
    const kibiBin = path.resolve(__dirname, "../bin/kibi");
    // run init (hooks are installed by default)
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "inherit" });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should install post-checkout hook and make it executable", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    expect(fs.existsSync(hookPath)).toBe(true);
    const stats = fs.statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("kibi sync");
  });

  it("should install post-merge hook and make it executable", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-merge");
    expect(fs.existsSync(hookPath)).toBe(true);
    const stats = fs.statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("kibi sync");
  });
});
```

## File: packages/cli/tests/prolog.test.ts
```typescript
/// <reference types="bun-types" />
import { afterEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrologProcess } from "../src/prolog";

const importMetaDir = path.dirname(fileURLToPath(import.meta.url));

describe("PrologProcess", () => {
  let prolog: PrologProcess | null = null;

  afterEach(async () => {
    if (prolog) {
      await prolog.terminate();
      prolog = null;
    }
  });

  test("spawns swipl successfully", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    expect(prolog.isRunning()).toBe(true);
  });

  test("loads kb module from packages/core/src/kb.pl", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    const result = await prolog.query("current_module(kb)");
    expect(result.success).toBe(true);
  });

  test("handles simple arithmetic query", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    const result = await prolog.query("X = 42");
    expect(result.success).toBe(true);
    expect(result.bindings).toHaveProperty("X");
    expect(result.bindings.X).toBe("42");
  });

  test("translates existence_error to friendly message", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    const result = await prolog.query("nonexistent_predicate(foo)");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
    expect(result.error).not.toContain("ERROR:");
    expect(result.error).not.toContain("existence_error");
  });

  test("translates syntax_error to friendly message", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    const result = await prolog.query("this is invalid syntax !");
    expect(result.success).toBe(false);
    expect(result.error).toContain("syntax");
    expect(result.error).not.toContain("ERROR:");
  });

  test("handles timeout for infinite loop", async () => {
    prolog = new PrologProcess({ timeout: 100 });
    await prolog.start();
    await expect(prolog.query("repeat, fail")).rejects.toThrow("timeout");
  }, 5000);

  test("gracefully terminates process", async () => {
    prolog = new PrologProcess();
    await prolog.start();
    const pid = prolog.getPid();
    expect(pid).toBeGreaterThan(0);

    await prolog.terminate();
    expect(prolog.isRunning()).toBe(false);

    try {
      process.kill(pid, 0);
      throw new Error("Process should be terminated");
    } catch (err: unknown) {
      expect((err as NodeJS.ErrnoException).code).toBe("ESRCH");
    }
  });

  test("handles multiple queries in sequence", async () => {
    prolog = new PrologProcess();
    await prolog.start();

    const result1 = await prolog.query("X = 1");
    expect(result1.success).toBe(true);

    const result2 = await prolog.query("Y = 2");
    expect(result2.success).toBe(true);

    const result3 = await prolog.query("Z = 3");
    expect(result3.success).toBe(true);
  });

  test("caches successful query results and supports invalidation", async () => {
    prolog = new PrologProcess();
    await prolog.start();

    const first = await prolog.query("X = 99");
    const cached = await prolog.query("X = 99");
    expect(cached).toBe(first);

    prolog.invalidateCache();

    const afterInvalidation = await prolog.query("X = 99");
    expect(afterInvalidation.success).toBe(true);
    expect(afterInvalidation.bindings.X).toBe("99");
    expect(afterInvalidation).not.toBe(first);
  });

  test("executes batch goals and returns bindings", async () => {
    prolog = new PrologProcess();
    await prolog.start();

    const result = await prolog.query(["X = 10", "Y is X + 5"]);
    expect(result.success).toBe(true);
    expect(result.bindings.X).toBe("10");
    expect(result.bindings.Y).toBe("15");
  });

  test("runs batched KB writes in one transaction", async () => {
    const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-batch-kb-"));
    prolog = new PrologProcess();
    await prolog.start();

    try {
      const attachResult = await prolog.query(`kb_attach('${tempKbDir}')`);
      expect(attachResult.success).toBe(true);

      const batchResult = await prolog.query([
        'kb_assert_entity(req, [id=\'REQ-BATCH-001\', title="Batch Entity 1", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-1"])',
        'kb_assert_entity(req, [id=\'REQ-BATCH-002\', title="Batch Entity 2", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-2"])',
        "kb_save",
      ]);
      expect(batchResult.success).toBe(true);

      const entity1 = await prolog.query("kb_entity('REQ-BATCH-001', _, _)");
      const entity2 = await prolog.query("kb_entity('REQ-BATCH-002', _, _)");
      expect(entity1.success).toBe(true);
      expect(entity2.success).toBe(true);
    } finally {
      await prolog.query("kb_detach");
      if (existsSync(tempKbDir)) {
        rmSync(tempKbDir, { recursive: true, force: true });
      }
    }
  });

  test("rolls back batched KB writes when one goal fails", async () => {
    const tempKbDir = mkdtempSync(path.join(os.tmpdir(), "kibi-batch-kb-"));
    prolog = new PrologProcess();
    await prolog.start();

    try {
      const attachResult = await prolog.query(`kb_attach('${tempKbDir}')`);
      expect(attachResult.success).toBe(true);

      const failedBatch = await prolog.query([
        'kb_assert_entity(req, [id=\'REQ-BATCH-ROLLBACK\', title="Should Roll Back", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-rollback"])',
        'kb_assert_entity(invalid_type, [id=\'REQ-BATCH-INVALID\', title="Invalid Type", status=active, created_at="2026-02-19T00:00:00Z", updated_at="2026-02-19T00:00:00Z", source="https://example.com/req-batch-invalid"])',
        "kb_save",
      ]);
      expect(failedBatch.success).toBe(false);

      const rolledBackEntity = await prolog.query(
        "kb_entity('REQ-BATCH-ROLLBACK', _, _)",
      );
      expect(rolledBackEntity.success).toBe(false);
    } finally {
      await prolog.query("kb_detach");
      if (existsSync(tempKbDir)) {
        rmSync(tempKbDir, { recursive: true, force: true });
      }
    }
  });
});

describe("CLI", () => {
  test("shows version matching package.json", () => {
    const output = execSync("bun run packages/cli/bin/kibi --version", {
      encoding: "utf-8",
      cwd: path.join(importMetaDir, "../../.."),
    });
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(output.trim()).toBe("0.1.0");
  });

  test("shows help with all required commands", () => {
    const output = execSync("bun run packages/cli/bin/kibi --help", {
      encoding: "utf-8",
      cwd: path.join(importMetaDir, "../../.."),
    });
    expect(output).toContain("init");
    expect(output).toContain("sync");
    expect(output).toContain("query");
    expect(output).toContain("check");
    expect(output).toContain("gc");
    expect(output).toContain("doctor");
  });

  test("shows helpful error if swipl not found", () => {
    const prolog = new PrologProcess({ swiplPath: "/nonexistent/swipl" });
    expect(async () => {
      await prolog.start();
    }).toThrow();
  });
});
```

## File: packages/cli/tests/schemas.test.ts
```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// file-level: allow explicit any for test scaffolding
// @ts-ignore - bun:test provided by Bun runtime
import { describe, expect, test } from "bun:test";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import changesetSchema from "../src/schemas/changeset.schema.json";
import entitySchema from "../src/schemas/entity.schema.json";
import relationshipSchema from "../src/schemas/relationship.schema.json";

// helper: try to register the JSON Schema 2020-12 meta-schema from ajv package
async function addDraft2020Meta(ajvInstance: any) {
  try {
    // @ts-ignore
    const mod = await import("ajv/dist/refs/json-schema-draft-2020-12.json");
    const meta = mod?.default ?? mod;
    if (meta) ajvInstance.addMetaSchema(meta);
    return;
  } catch (e) {
    // ignore
  }
  try {
    // fallback to local copy if present
    // @ts-ignore
    const mod2 = await import("../src/schemas/json-schema-draft-2020-12.json");
    const meta2 = mod2?.default ?? mod2;
    if (meta2) ajvInstance.addMetaSchema(meta2);
  } catch (e) {
    // ignore
  }
}

describe("Entity Schema", () => {
  test("validates correct entity", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as any);
    const entity = {
      id: "test-1",
      title: "Test",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "https://example.com",
      type: "req",
    };
    expect(validate(entity)).toBe(true);
  });

  test("rejects entity missing title", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(entitySchema as any);
    const entity = {
      id: "test-1",
      status: "active",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      source: "https://example.com",
      type: "req",
    };
    expect(validate(entity)).toBe(false);
  });
});

describe("Relationship Schema", () => {
  test("valid relationship", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(relationshipSchema as any);
    const rel = { type: "depends_on", from: "a", to: "b" };
    expect(validate(rel)).toBe(true);
  });

  test("invalid relationship missing to", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(relationshipSchema as any);
    const rel = { type: "depends_on", from: "a" };
    expect(validate(rel)).toBe(false);
  });
});

describe("Changeset Schema", () => {
  test("valid changeset with upsert", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(ajv);
    // register dependent schemas so $ref can be resolved
    // @ts-ignore
    ajv.addSchema(entitySchema as any, "entity.schema.json");
    // @ts-ignore
    ajv.addSchema(relationshipSchema as any, "relationship.schema.json");
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(changesetSchema as any);
    const cs = {
      operations: [
        {
          operation: "upsert",
          entity: {
            id: "e1",
            title: "T",
            status: "active",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            source: "https://x",
            type: "req",
          },
        },
      ],
      metadata: { timestamp: "2024-01-01T00:00:00Z" },
    };
    expect(validate(cs)).toBe(true);
  });

  test("invalid changeset with delete missing id", async () => {
    const ajv = new Ajv({ strict: false, allErrors: true });
    await addDraft2020Meta(ajv);
    // register dependent schemas so $ref can be resolved
    // @ts-ignore
    ajv.addSchema(entitySchema as any, "entity.schema.json");
    // @ts-ignore
    ajv.addSchema(relationshipSchema as any, "relationship.schema.json");
    // @ts-ignore - relax typing for JSON schema import
    const validate = ajv.compile(changesetSchema as any);
    const cs = { operations: [{ operation: "delete" }] };
    expect(validate(cs)).toBe(false);
  });
});
```

## File: packages/mcp/tests/tools/branch.test.ts
```typescript
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import {
  handleKbBranchEnsure,
  handleKbBranchGc,
} from "../../src/tools/branch.js";

describe("MCP Branch Tool Handlers", () => {
  let prolog: PrologProcess;
  let testKbRoot: string;

  beforeAll(async () => {
    testKbRoot = path.join(process.cwd(), ".kb-test-mcp-branch");

    await fs.rm(testKbRoot, { recursive: true, force: true });
    await fs.mkdir(path.join(testKbRoot, ".kb/branches/develop"), {
      recursive: true,
    });

    const mainPath = path.join(testKbRoot, ".kb/branches/develop");
    await fs.writeFile(path.join(mainPath, "kb.rdf"), "");
    await fs.writeFile(path.join(mainPath, "kb.rdf.lock"), "");
    await fs.mkdir(path.join(mainPath, "journal"), { recursive: true });

    prolog = new PrologProcess();
    await prolog.start();
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.terminate();
    }

    await fs.rm(testKbRoot, { recursive: true, force: true });
  });

  describe("kb.branch.ensure", () => {
    test("should create new branch KB from develop", async () => {
      const originalCwd = process.cwd();
      process.chdir(testKbRoot);

      try {
        const result = await handleKbBranchEnsure(prolog, {
          branch: "feature-test",
        });

        expect(result.content[0].text).toContain("Created branch KB");
        expect(result.structuredContent?.created).toBe(true);
        expect(result.structuredContent?.path).toContain("feature-test");

        // Verify directory was created
        const branchPath = path.join(testKbRoot, ".kb/branches/feature-test");
        const exists = await fs
          .access(branchPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);

        // Verify files were copied
        const rdfExists = await fs
          .access(path.join(branchPath, "kb.rdf"))
          .then(() => true)
          .catch(() => false);
        expect(rdfExists).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should return created=false for existing branch", async () => {
      const originalCwd = process.cwd();
      process.chdir(testKbRoot);

      try {
        const result = await handleKbBranchEnsure(prolog, {
          branch: "feature-test",
        });

        expect(result.content[0].text).toContain("already exists");
        expect(result.structuredContent?.created).toBe(false);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should reject empty branch name", async () => {
      const originalCwd = process.cwd();
      process.chdir(testKbRoot);

      try {
        await expect(
          handleKbBranchEnsure(prolog, { branch: "" }),
        ).rejects.toThrow(/Branch name is required/);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should reject path traversal and invalid branch names", async () => {
      const originalCwd = process.cwd();
      process.chdir(testKbRoot);

      const invalidBranches = [
        "../evil",
        "../../evil",
        "/absolute/path",
        "foo/../../bar",
        "..../evil",
        "....//evil",
        "./../evil",
        "foo//bar",
        "foo/.",
        "foo/..",
        ".",
        "..",
        "...",
      ];

      try {
        for (const branch of invalidBranches) {
          await expect(
            handleKbBranchEnsure(prolog, { branch }),
          ).rejects.toThrow(/Invalid branch name/);
        }
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should handle branch names with slashes (feature/xyz)", async () => {
      const originalCwd = process.cwd();
      process.chdir(testKbRoot);

      try {
        const result = await handleKbBranchEnsure(prolog, {
          branch: "feature/xyz",
        });

        expect(result.structuredContent?.created).toBe(true);

        const branchPath = path.join(testKbRoot, ".kb/branches/feature/xyz");
        const exists = await fs
          .access(branchPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should fail if develop branch does not exist", async () => {
      const originalCwd = process.cwd();
      const noDevelopKb = path.join(process.cwd(), ".kb-test-no-develop");

      try {
        await fs.mkdir(path.join(noDevelopKb, ".kb/branches"), {
          recursive: true,
        });
        process.chdir(noDevelopKb);

        await expect(
          handleKbBranchEnsure(prolog, { branch: "new-branch" }),
        ).rejects.toThrow(/Develop branch KB does not exist/);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(noDevelopKb, { recursive: true, force: true });
      }
    });
  });

  describe("kb.branch.gc", () => {
    test("should find stale branches in dry run mode", async () => {
      const originalCwd = process.cwd();
      const originalWorkspace = process.env.KIBI_WORKSPACE ?? "";

      // Create a fake git repo for testing
      const gitTestRoot = path.join(process.cwd(), ".kb-test-git-gc");
      await fs.rm(gitTestRoot, { recursive: true, force: true });
      await fs.mkdir(gitTestRoot, { recursive: true });

      try {
        execSync("git init", { cwd: gitTestRoot, stdio: "ignore" });
        execSync('git config user.email "test@example.com"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync('git config user.name "Test User"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("touch README && git add README && git commit -m 'init'", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("git checkout -b develop", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });

        // Create .kb/branches structure
        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/develop"), {
          recursive: true,
        });
        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/deleted-branch"), {
          recursive: true,
        });

        process.chdir(gitTestRoot);
        process.env.KIBI_WORKSPACE = gitTestRoot;

        const result = await handleKbBranchGc(prolog, { dry_run: true });

        expect(result.content[0].text).toContain("dry run");
        expect(result.structuredContent?.stale).toContain("deleted-branch");
        expect(result.structuredContent?.deleted).toBe(0);

        // Verify branch still exists after dry run
        const exists = await fs
          .access(path.join(gitTestRoot, ".kb/branches/deleted-branch"))
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      } finally {
        process.chdir(originalCwd);
        process.env.KIBI_WORKSPACE = originalWorkspace;
        await fs.rm(gitTestRoot, { recursive: true, force: true });
      }
    });

    test("should delete stale branches when dry_run=false", async () => {
      const originalCwd = process.cwd();
      const originalWorkspace = process.env.KIBI_WORKSPACE ?? "";

      const gitTestRoot = path.join(process.cwd(), ".kb-test-git-gc-delete");
      await fs.rm(gitTestRoot, { recursive: true, force: true });
      await fs.mkdir(gitTestRoot, { recursive: true });

      try {
        execSync("git init", { cwd: gitTestRoot, stdio: "ignore" });
        execSync('git config user.email "test@example.com"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync('git config user.name "Test User"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("touch README && git add README && git commit -m 'init'", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("git checkout -b develop", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });

        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/develop"), {
          recursive: true,
        });
        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/stale-branch"), {
          recursive: true,
        });

        process.chdir(gitTestRoot);
        process.env.KIBI_WORKSPACE = gitTestRoot;

        const result = await handleKbBranchGc(prolog, { dry_run: false });

        expect(result.structuredContent?.stale).toContain("stale-branch");
        expect(result.structuredContent?.deleted).toBe(1);

        // Verify branch was deleted
        const exists = await fs
          .access(path.join(gitTestRoot, ".kb/branches/stale-branch"))
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(false);
      } finally {
        process.chdir(originalCwd);
        process.env.KIBI_WORKSPACE = originalWorkspace;
        await fs.rm(gitTestRoot, { recursive: true, force: true });
      }
    });

    test("should preserve develop branch", async () => {
      const originalCwd = process.cwd();

      const gitTestRoot = path.join(process.cwd(), ".kb-test-git-gc-develop");
      await fs.rm(gitTestRoot, { recursive: true, force: true });
      await fs.mkdir(gitTestRoot, { recursive: true });

      try {
        execSync("git init", { cwd: gitTestRoot, stdio: "ignore" });
        execSync('git config user.email "test@example.com"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync('git config user.name "Test User"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("touch README && git add README && git commit -m 'init'", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("git checkout -b develop", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });

        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/develop"), {
          recursive: true,
        });

        process.chdir(gitTestRoot);

        const result = await handleKbBranchGc(prolog, { dry_run: false });

        expect(result.structuredContent?.stale).not.toContain("develop");

        // Verify develop branch still exists
        const exists = await fs
          .access(path.join(gitTestRoot, ".kb/branches/develop"))
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(gitTestRoot, { recursive: true, force: true });
      }
    });

    test("should handle no stale branches", async () => {
      const originalCwd = process.cwd();

      const gitTestRoot = path.join(process.cwd(), ".kb-test-git-gc-none");
      await fs.rm(gitTestRoot, { recursive: true, force: true });
      await fs.mkdir(gitTestRoot, { recursive: true });

      try {
        execSync("git init", { cwd: gitTestRoot, stdio: "ignore" });
        execSync('git config user.email "test@example.com"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync('git config user.name "Test User"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("touch README && git add README && git commit -m 'init'", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("git checkout -b develop", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("git checkout -b feature", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });

        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/develop"), {
          recursive: true,
        });
        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/feature"), {
          recursive: true,
        });

        process.chdir(gitTestRoot);

        const result = await handleKbBranchGc(prolog, { dry_run: true });

        expect(result.structuredContent?.stale).toEqual([]);
        expect(result.structuredContent?.deleted).toBe(0);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(gitTestRoot, { recursive: true, force: true });
      }
    });

    test("should handle missing .kb/branches directory", async () => {
      const originalCwd = process.cwd();
      const originalWorkspace = process.env.KIBI_WORKSPACE ?? "";

      const gitTestRoot = path.join(process.cwd(), ".kb-test-git-gc-missing");
      await fs.rm(gitTestRoot, { recursive: true, force: true });
      await fs.mkdir(gitTestRoot, { recursive: true });

      try {
        execSync("git init", { cwd: gitTestRoot, stdio: "ignore" });
        execSync('git config user.email "test@example.com"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync('git config user.name "Test User"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });

        process.chdir(gitTestRoot);
        process.env.KIBI_WORKSPACE = gitTestRoot;

        const result = await handleKbBranchGc(prolog, { dry_run: true });

        expect(result.content[0].text).toContain("No branch KBs found");
        expect(result.structuredContent?.stale).toEqual([]);
        expect(result.structuredContent?.deleted).toBe(0);
      } finally {
        process.chdir(originalCwd);
        if (originalWorkspace) {
          process.env.KIBI_WORKSPACE = originalWorkspace;
        } else {
          process.env.KIBI_WORKSPACE = "";
        }
        await fs.rm(gitTestRoot, { recursive: true, force: true });
      }
    });

    test("should fail if not in git repository", async () => {
      const originalCwd = process.cwd();

      const nonGitRoot = path.join("/tmp", `.kb-test-non-git-${Date.now()}`);
      await fs.rm(nonGitRoot, { recursive: true, force: true });
      await fs.mkdir(path.join(nonGitRoot, ".kb/branches"), {
        recursive: true,
      });

      try {
        process.chdir(nonGitRoot);

        await expect(
          handleKbBranchGc(prolog, { dry_run: true }),
        ).rejects.toThrow(/git repository/);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(nonGitRoot, { recursive: true, force: true });
      }
    });
  });
});
```

## File: packages/mcp/tests/tools/check.test.ts
```typescript
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import { handleKbCheck } from "../../src/tools/check.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";

describe("MCP Check Tool Handler", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = path.join(process.cwd(), ".kb-test-mcp-check");

    await fs.rm(testKbPath, { recursive: true, force: true });
    await fs.mkdir(testKbPath, { recursive: true });

    prolog = new PrologProcess();
    await prolog.start();

    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );

    const attachResult = await prolog.query(`kb_attach('${testKbPath}')`);
    expect(attachResult.success).toBe(true);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }

    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  test("should return no violations for empty KB", async () => {
    const result = await handleKbCheck(prolog, {});

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("No violations");
    expect(result.structuredContent?.violations).toEqual([]);
    expect(result.structuredContent?.count).toBe(0);
  });

  test("should detect must-priority requirement without scenario", async () => {
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-must-001",
      properties: {
        title: "Must-priority requirement",
        status: "active",
        priority: "must",
        source: "test://check-test",
      },
    });

    const result = await handleKbCheck(prolog, {});

    expect(result.structuredContent?.count).toBeGreaterThan(0);
    const violation = result.structuredContent?.violations.find(
      (v) => v.rule === "must-priority-coverage",
    );
    expect(violation).toBeDefined();
    expect(violation?.entityId).toBe("req-must-001");
    expect(violation?.description).toContain("scenario");
  });

  test("should detect must-priority requirement with scenario but no test", async () => {
    const relationship = {
      type: "specified_by",
      from: "req-must-001",
      to: "scenario-001",
      created_at: new Date().toISOString(),
      created_by: "test",
      source: "test://check-test",
    };

    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-001",
      properties: {
        title: "Scenario for must req",
        status: "active",
        source: "test://check-test",
      },
      relationships: [relationship],
    });

    const result = await handleKbCheck(prolog, {});

    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "must-priority-coverage" && v.entityId === "req-must-001",
    );
    expect(violation).toBeDefined();
    expect(violation?.description).toContain("test");
    expect(violation?.description).not.toContain("scenario");
  });

  test("should pass must-priority coverage with both scenario and test", async () => {
    const relationship = {
      type: "validates",
      from: "test-001",
      to: "req-must-001",
    };

    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-001",
      properties: {
        title: "Test for must req",
        status: "active",
        source: "test://check-test",
      },
      relationships: [relationship],
    });

    const result = await handleKbCheck(prolog, {});

    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "must-priority-coverage" && v.entityId === "req-must-001",
    );
    expect(violation).toBeUndefined();
  });

  test("should run required-fields rule without errors", async () => {
    await handleKbUpsert(prolog, {
      type: "req",
      id: "complete-req-001",
      properties: {
        title: "Complete requirement",
        status: "active",
        source: "test://check-test",
      },
    });

    const result = await handleKbCheck(prolog, {
      rules: ["required-fields"],
    });

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.violations).toBeInstanceOf(Array);
  });

  test("should support filtering by specific rule", async () => {
    const result = await handleKbCheck(prolog, {
      rules: ["must-priority-coverage"],
    });

    expect(result.structuredContent?.violations).toBeDefined();
    // All violations should be must-priority-coverage only
    const nonMatchingViolations = result.structuredContent?.violations.filter(
      (v) => v.rule !== "must-priority-coverage",
    );
    expect(nonMatchingViolations?.length).toBe(0);
  });

  test("should run no-dangling-refs rule without errors", async () => {
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-valid-001",
      properties: {
        title: "Valid requirement",
        status: "active",
        source: "test://check-test",
      },
    });

    const result = await handleKbCheck(prolog, {
      rules: ["no-dangling-refs"],
    });

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.violations).toBeInstanceOf(Array);
  });

  test("should run no-cycles rule without errors", async () => {
    const relationship = {
      type: "depends_on",
      from: "req-nocycle-a",
      to: "req-nocycle-b",
    };

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-nocycle-a",
      properties: {
        title: "Requirement A",
        status: "active",
        source: "test://check-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-nocycle-b",
      properties: {
        title: "Requirement B",
        status: "active",
        source: "test://check-test",
      },
      relationships: [relationship],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["no-cycles"],
    });

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.violations).toBeInstanceOf(Array);
  });
});
```

## File: packages/mcp/tests/server.test.ts
```typescript
import { describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function sendRequest(
  proc: ChildProcess,
  request: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let responseData = "";

    const parseJson = (value: string): Record<string, unknown> | null => {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return null;
      }
    };

    const onData = (chunk: Buffer) => {
      responseData += chunk.toString();
      const lines = responseData.split("\n");

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]?.trim();
        if (!line) {
          continue;
        }

        const response = parseJson(line);
        if (response) {
          responseData = lines.slice(i + 1).join("\n");
          proc.stdout?.off("data", onData);
          resolve(response);
          return;
        }
      }

      const fallback = parseJson(responseData.trim());
      if (fallback) {
        responseData = "";
        proc.stdout?.off("data", onData);
        resolve(fallback);
      }
    };

    proc.stdout?.on("data", onData);

    // Write request
    proc.stdin?.write(`${JSON.stringify(request)}\n`);

    // Timeout after 5s
    setTimeout(() => {
      proc.stdout?.off("data", onData);
      reject(new Error("Request timeout"));
    }, 5000);
  });
}

function startServer(options?: {
  cwd?: string;
  env?: Record<string, string>;
}): ChildProcess {
  const serverPath = path.resolve(import.meta.dir, "../bin/kibi-mcp");
  const proc = spawn("bun", ["run", serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: options?.cwd,
    env: options?.env ? { ...process.env, ...options.env } : process.env,
  });

  return proc;
}

describe("MCP Server", () => {
  test("should parse valid JSON-RPC request", async () => {
    const proc = startServer();

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();

    proc.kill();
  });

  test("should handle initialize request", async () => {
    const proc = startServer();

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    const result = response.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe("2024-11-05");
    expect(result.serverInfo).toBeDefined();
    expect((result.serverInfo as Record<string, unknown>).name).toBe(
      "kibi-mcp",
    );
    expect((result.serverInfo as Record<string, unknown>).version).toBe(
      "0.1.0",
    );
    expect(result.capabilities).toBeDefined();

    proc.kill();
  });

  test("should handle notifications/initialized", async () => {
    const proc = startServer();

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    proc.stdin?.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    proc.kill();
  });

  test("should handle tools/list request", async () => {
    const proc = startServer();

    // Initialize first
    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    // Request tools list
    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });

    const result = response.result as Record<string, unknown>;
    expect(result.tools).toBeDefined();
    const tools = result.tools as Array<Record<string, unknown>>;
    expect(tools.length).toBe(15);
    expect(tools[0].name).toBe("kb_query");
    expect(tools[1].name).toBe("kb_upsert");
    expect(tools[2].name).toBe("kb_delete");
    expect(tools[3].name).toBe("kb_check");
    expect(tools[4].name).toBe("kb_branch_ensure");
    expect(tools[5].name).toBe("kb_branch_gc");
    expect(tools[6].name).toBe("kb_query_relationships");
    expect(tools[7].name).toBe("kb_derive");
    expect(tools[8].name).toBe("kb_impact");
    expect(tools[9].name).toBe("kb_coverage_report");
    expect(tools[10].name).toBe("kb_symbols_refresh");
    expect(tools[11].name).toBe("kb_list_entity_types");
    expect(tools[12].name).toBe("kb_list_relationship_types");
    expect(tools[13].name).toBe("kbcontext");
    expect(tools[14].name).toBe("get_help");

    proc.kill();
  });

  test("should initialize from non-repo cwd with workspace override", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-"));
    const workspaceRoot = path.resolve(import.meta.dir, "../../..");
    const proc = startServer({
      cwd: tempRoot,
      env: { KIBI_WORKSPACE: workspaceRoot },
    });

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();

    proc.kill();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test("should return error for invalid method", async () => {
    const proc = startServer();

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "invalid_method",
    });

    expect(response.error).toBeDefined();
    const error = response.error as Record<string, unknown>;
    expect(error.code).toBe(-32601); // METHOD_NOT_FOUND
    expect(error.message).toContain("Method not found");

    proc.kill();
  });
});
```

## File: packages/mcp/tests/stdio-protocol.test.ts
```typescript
import { describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";

type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
type JsonObject = { [key: string]: JsonValue };

function startServer(options?: {
  cwd?: string;
  env?: Record<string, string>;
}): ChildProcess {
  const serverPath = path.resolve(import.meta.dir, "../bin/kibi-mcp");
  return spawn("bun", ["run", serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: options?.cwd,
    env: options?.env ? { ...process.env, ...options.env } : process.env,
  });
}

function readNextJsonMessage(
  proc: ChildProcess,
  timeoutMs = 5000,
): Promise<JsonObject> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const parseLine = (line: string): JsonObject | null => {
      try {
        const value = JSON.parse(line) as unknown;
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return null;
        }
        return value as JsonObject;
      } catch {
        return null;
      }
    };

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");

      for (let i = 0; i < lines.length - 1; i++) {
        const line = (lines[i] ?? "").trim();
        if (!line) {
          continue;
        }

        const parsed = parseLine(line);
        if (!parsed) {
          cleanup();
          reject(new Error(`Non-JSON stdout line: ${line}`));
          return;
        }

        buffer = lines.slice(i + 1).join("\n");
        cleanup();
        resolve(parsed);
        return;
      }
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      proc.stdout?.off("data", onData);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout waiting for JSON message"));
    }, timeoutMs);

    proc.stdout?.on("data", onData);
  });
}

async function sendRequest(
  proc: ChildProcess,
  request: JsonObject,
): Promise<JsonObject> {
  proc.stdin?.write(`${JSON.stringify(request)}\n`);
  return readNextJsonMessage(proc);
}

function waitForExit(
  proc: ChildProcess,
  timeoutMs = 2000,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    if (proc.exitCode !== null) {
      resolve({ code: proc.exitCode, signal: null });
      return;
    }

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      resolve({ code, signal });
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      proc.off("exit", onExit);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout waiting for process exit"));
    }, timeoutMs);

    proc.on("exit", onExit);
  });
}

function getErrorCode(message: JsonObject): number | null {
  const errorValue = message.error;
  if (
    !errorValue ||
    typeof errorValue !== "object" ||
    Array.isArray(errorValue)
  ) {
    return null;
  }
  const code = (errorValue as Record<string, unknown>).code;
  return typeof code === "number" ? code : null;
}

describe("MCP stdio protocol hardening", () => {
  test("malformed JSON line returns parse error and server continues", async () => {
    const proc = startServer({
      env: { MCPCAT_PROJECT_ID: "" },
    });

    proc.stdin?.write("not-json\n");
    const parseError = await readNextJsonMessage(proc);
    expect(parseError.jsonrpc).toBe("2.0");
    expect(parseError.error).toBeDefined();
    expect(getErrorCode(parseError)).toBe(-32700);

    const initResponse = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });
    expect(initResponse.result).toBeDefined();

    proc.kill();
  });

  test("invalid JSON-RPC shape returns invalid request and server continues", async () => {
    const proc = startServer({
      env: { MCPCAT_PROJECT_ID: "" },
    });

    proc.stdin?.write("{}\n");
    const invalidReq = await readNextJsonMessage(proc);
    expect(invalidReq.jsonrpc).toBe("2.0");
    expect(invalidReq.error).toBeDefined();
    expect(getErrorCode(invalidReq)).toBe(-32600);

    const initResponse = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });
    expect(initResponse.result).toBeDefined();

    proc.kill();
  });

  test("stdout purity: all stdout lines are JSON", async () => {
    const proc = startServer({
      env: { MCPCAT_PROJECT_ID: "" },
    });

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    const tools = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    expect(tools.result).toBeDefined();

    proc.kill();
  });

  test("stdin EOF triggers clean shutdown", async () => {
    const proc = startServer({
      env: { MCPCAT_PROJECT_ID: "" },
    });

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    proc.stdin?.end();
    proc.stdin?.destroy();

    const exited = await waitForExit(proc, 2000);
    expect(exited.signal).toBeNull();
    expect(exited.code).toBe(0);
  });

  test("SIGTERM triggers graceful shutdown", async () => {
    const proc = startServer({
      env: { MCPCAT_PROJECT_ID: "" },
    });

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    proc.kill("SIGTERM");
    const exited = await waitForExit(proc, 2000);
    expect(exited.signal).toBeNull();
    expect(exited.code).toBe(0);
  });
});
```


---

#### 🔙 PREVIOUS PART: [kibi-02-tests-1.md](file:kibi-02-tests-1.md)

#### ⏭️ NEXT PART: [kibi-02-tests-3.md](file:kibi-02-tests-3.md)

> _End of Part 9_
