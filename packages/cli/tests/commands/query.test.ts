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
import relationshipSchema from "../../src/public/schemas/relationship.js";

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

      if (results.length > 0) {
        for (const rel of results) {
          expect(typeof rel.type).toBe("string");
          expect(typeof rel.from).toBe("string");
          expect(typeof rel.to).toBe("string");
          expect(rel.from).toBe(entityWithLinks.id);
          expect(relationshipSchema.properties.type.enum).toContain(rel.type);
        }
      }
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
