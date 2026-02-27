# Pack: kibi-02-tests (Part 3)


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
  mcp/
    tests/
      tools/
        context.test.ts
        crud.test.ts
        idempotency.test.ts
        inference.test.ts
        list-types.test.ts
        prolog-list.test.ts
        query-relationships.test.ts
        query.test.ts
      workspace.test.ts
```

# Files

## File: packages/mcp/tests/tools/context.test.ts
```typescript
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import { handleKbContext } from "../../src/tools/context.js";

describe("MCP Context Tool", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = path.join(process.cwd(), ".kb-test-mcp-context");

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

  describe("kbcontext", () => {
    test("should return entities for known source file", async () => {
      const result = await handleKbContext(prolog, {
        sourceFile: "src/features/feature.ts",
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent?.sourceFile).toBe(
        "src/features/feature.ts",
      );
      expect(result.structuredContent?.entities).toBeInstanceOf(Array);
      expect(result.structuredContent?.provenance).toEqual({
        predicate: "kb_entities_by_source",
        deterministic: true,
      });
    });

    test("should return empty array for unknown path", async () => {
      const result = await handleKbContext(prolog, {
        sourceFile: "nonexistent/path/to/file.ts",
      });

      expect(result.structuredContent?.entities).toEqual([]);
      expect(result.structuredContent?.relationships).toEqual([]);
    });

    test("should include first-hop relationships", async () => {
      const result = await handleKbContext(prolog, {
        sourceFile: "src/features/feature.ts",
      });

      if (
        result.structuredContent?.entities &&
        result.structuredContent.entities.length > 0
      ) {
        expect(result.structuredContent?.relationships).toBeInstanceOf(Array);
      }
    });

    test("should return error when branch parameter is mismatched", async () => {
      const result = await handleKbContext(
        prolog,
        {
          sourceFile: "src/features/feature.ts",
          branch: "wrong-branch",
        },
        "develop",
      );

      expect(result.content[0].text).toContain(
        "branch parameter is not supported server-side",
      );
      expect(result.content[0].text).toContain("Requested: wrong-branch");
      expect(result.content[0].text).toContain("Active: develop");
      expect(result.structuredContent).toBeUndefined();
    });

    test("should work normally when branch parameter matches", async () => {
      const result = await handleKbContext(
        prolog,
        {
          sourceFile: "src/features/feature.ts",
          branch: "develop",
        },
        "develop",
      );

      expect(result.content[0].text).not.toContain(
        "branch parameter is not supported server-side",
      );
      expect(result.structuredContent).toBeDefined();
    });

    test("should work normally when branch parameter is omitted", async () => {
      const result = await handleKbContext(
        prolog,
        {
          sourceFile: "src/features/feature.ts",
        },
        "develop",
      );

      expect(result.content[0].text).not.toContain(
        "branch parameter is not supported server-side",
      );
      expect(result.structuredContent).toBeDefined();
    });
  });
});
```

## File: packages/mcp/tests/tools/crud.test.ts
```typescript
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
  beforeEach,
} from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";
import { handleKbQuery } from "../../src/tools/query.js";

describe("MCP CRUD Tool Handlers", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = path.join(process.cwd(), ".kb-test-mcp-crud");
    prolog = new PrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
  });

  beforeEach(async () => {
    await fs.rm(testKbPath, { recursive: true, force: true });
    await fs.mkdir(testKbPath, { recursive: true });
    await prolog.query(`kb_attach('${testKbPath}')`);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }
    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  describe("kb.query", () => {
    test("should query all entities", async () => {
      const result = await handleKbQuery(prolog, {});
      expect(result.structuredContent?.entities).toBeInstanceOf(Array);
    });
  });

  describe("kb.upsert", () => {
    test("should create a new entity", async () => {
      const result = await handleKbUpsert(prolog, {
        type: "req",
        id: "test-req-001",
        properties: {
          title: "Test Requirement",
          status: "active",
          source: "test://mcp-crud",
        },
      });
      expect(result.structuredContent?.created).toBe(1);
    });

    test("should update existing entity", async () => {
      await handleKbUpsert(prolog, {
        type: "req",
        id: "test-req-002",
        properties: {
          title: "Original Title",
          status: "active",
          source: "test://mcp-crud",
        },
      });

      const result = await handleKbUpsert(prolog, {
        type: "req",
        id: "test-req-002",
        properties: {
          title: "Updated Title",
          status: "active",
          source: "test://mcp-crud",
        },
      });

      expect(result.structuredContent?.updated).toBe(1);
      expect(result.structuredContent?.created).toBe(0);
    });
  });

  describe("batch relationships", () => {
    test("should create entity with multiple relationships", async () => {
      // Create target entities first
      await handleKbUpsert(prolog, {
        type: "req",
        id: "batch-target-1",
        properties: { title: "Target 1", status: "active", source: "test" },
      });
      await handleKbUpsert(prolog, {
        type: "req",
        id: "batch-target-2",
        properties: { title: "Target 2", status: "active", source: "test" },
      });
      await handleKbUpsert(prolog, {
        type: "req",
        id: "batch-target-3",
        properties: { title: "Target 3", status: "active", source: "test" },
      });

      // Create entity with batch relationships
      const result = await handleKbUpsert(prolog, {
        type: "test",
        id: "batch-test-001",
        properties: {
          title: "Batch Test",
          status: "active",
          source: "test://batch",
        },
        relationships: [
          { type: "validates", from: "batch-test-001", to: "batch-target-1" },
          { type: "validates", from: "batch-test-001", to: "batch-target-2" },
          { type: "validates", from: "batch-test-001", to: "batch-target-3" },
        ],
      });

      expect(result.structuredContent?.created).toBe(1);
      expect(result.structuredContent?.relationships_created).toBe(3);
    }, 15000);

    test("should support backward compatibility without relationships", async () => {
      const result = await handleKbUpsert(prolog, {
        type: "req",
        id: "no-rel-req",
        properties: {
          title: "No Relationships",
          status: "active",
          source: "test://compat",
        },
      });

      expect(result.structuredContent?.created).toBe(1);
      expect(result.structuredContent?.relationships_created).toBe(0);
    });
  });

  describe("relationship idempotency", () => {
    test("should not create duplicate relationships when inserted twice", async () => {
      // Create entities
      await handleKbUpsert(prolog, {
        type: "req",
        id: "idempotency-req-1",
        properties: { title: "Req 1", status: "active", source: "test" },
      });
      await handleKbUpsert(prolog, {
        type: "scenario",
        id: "idempotency-scen-1",
        properties: { title: "Scen 1", status: "active", source: "test" },
      });

      // Create relationship first time
      await handleKbUpsert(prolog, {
        type: "req",
        id: "idempotency-req-1",
        properties: { title: "Req 1", status: "active", source: "test" },
        relationships: [
          {
            type: "specified_by",
            from: "idempotency-req-1",
            to: "idempotency-scen-1",
          },
        ],
      });

      // Create same relationship second time (should not duplicate)
      await handleKbUpsert(prolog, {
        type: "req",
        id: "idempotency-req-1",
        properties: { title: "Req 1", status: "active", source: "test" },
        relationships: [
          {
            type: "specified_by",
            from: "idempotency-req-1",
            to: "idempotency-scen-1",
          },
        ],
      });

      // Query to verify entity exists
      const queryResult = await handleKbQuery(prolog, {
        id: "idempotency-scen-1",
      });

      // The entity should exist
      expect(queryResult.structuredContent?.entities.length).toBe(1);
    }, 15000);

    test("should handle batch with duplicate relationships", async () => {
      // Create entities
      await handleKbUpsert(prolog, {
        type: "req",
        id: "idempotency-req-2",
        properties: { title: "Req 2", status: "active", source: "test" },
      });
      await handleKbUpsert(prolog, {
        type: "scenario",
        id: "idempotency-scen-2",
        properties: { title: "Scen 2", status: "active", source: "test" },
      });

      // Create batch with duplicate relationships
      const result = await handleKbUpsert(prolog, {
        type: "req",
        id: "idempotency-req-2",
        properties: { title: "Req 2", status: "active", source: "test" },
        relationships: [
          {
            type: "specified_by",
            from: "idempotency-req-2",
            to: "idempotency-scen-2",
          },
          {
            type: "specified_by",
            from: "idempotency-req-2",
            to: "idempotency-scen-2",
          },
        ],
      });

      // Should succeed (deduplication happens at KB layer)
      expect(result.structuredContent?.updated).toBe(1);
    }, 15000);
  });
});
```

## File: packages/mcp/tests/tools/idempotency.test.ts
```typescript
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  test,
  beforeEach,
} from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";

describe("KB Relationship Idempotency", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = path.join(process.cwd(), ".kb-test-idempotency");
    prolog = new PrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
  });

  beforeEach(async () => {
    await fs.rm(testKbPath, { recursive: true, force: true });
    await fs.mkdir(testKbPath, { recursive: true });
    await prolog.query(`kb_attach('${testKbPath}')`);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }
    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  test("should not create duplicate relationships when inserted twice", async () => {
    // 1. Create entities
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req1",
      properties: { title: "Req 1", status: "active", source: "test" },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scen1",
      properties: { title: "Scen 1", status: "active", source: "test" },
    });

    // 2. Assert relationship first time
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req1",
      properties: { title: "Req 1", status: "active", source: "test" },
      relationships: [{ type: "specified_by", from: "req1", to: "scen1" }],
    });

    // 3. Assert same relationship second time
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req1",
      properties: { title: "Req 1", status: "active", source: "test" },
      relationships: [{ type: "specified_by", from: "req1", to: "scen1" }],
    });

    // 4. Verify total count in KB using direct RDF query
    const countResult = await prolog.query(
      "findall(t(S,P,O), (kb_uri(Base), atom_concat(Base, specified_by, P), rdf(S, P, O)), Results)"
    );
    expect(countResult.success).toBe(true);
    const matches = countResult.bindings.Results.match(/t\(/g);
    expect(matches?.length).toBe(1);
  });

  test("should deduplicate relationships in a batch", async () => {
    // 1. Create entities
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req2",
      properties: { title: "Req 2", status: "active", source: "test" },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scen2",
      properties: { title: "Scen 2", status: "active", source: "test" },
    });

    // 2. Assert relationship twice in a batch
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req2",
      properties: { title: "Req 2", status: "active", source: "test" },
      relationships: [
        { type: "specified_by", from: "req2", to: "scen2" },
        { type: "specified_by", from: "req2", to: "scen2" },
      ],
    });

    // 3. Verify total count in KB using direct RDF query
    const countResult = await prolog.query(
      "findall(t(S,P,O), (kb_uri(Base), atom_concat(Base, specified_by, P), rdf(S, P, O)), Results)"
    );
    expect(countResult.success).toBe(true);
    const matches = countResult.bindings.Results.match(/t\(/g);
    expect(matches?.length).toBe(1);
  });

  test("should be idempotent when retrying after success", async () => {
    // 1. Create entities
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req3",
      properties: { title: "Req 3", status: "active", source: "test" },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scen3",
      properties: { title: "Scen 3", status: "active", source: "test" },
    });

    // 2. Assert relationship
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req3",
      properties: { title: "Req 3", status: "active", source: "test" },
      relationships: [{ type: "specified_by", from: "req3", to: "scen3" }],
    });

    // 3. Retry same assertion
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req3",
      properties: { title: "Req 3", status: "active", source: "test" },
      relationships: [{ type: "specified_by", from: "req3", to: "scen3" }],
    });

    // 4. Verify total count in KB
    const countResult = await prolog.query(
      "findall(t(S,P,O), (kb_uri(Base), atom_concat(Base, specified_by, P), rdf(S, P, O)), Results)"
    );
    expect(countResult.success).toBe(true);
    const matches = countResult.bindings.Results.match(/t\(/g);
    expect(matches?.length).toBe(1);
  });
});
```

## File: packages/mcp/tests/tools/inference.test.ts
```typescript
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import { handleKbCoverageReport } from "../../src/tools/coverage-report.js";
import { handleKbDerive } from "../../src/tools/derive.js";
import { handleKbImpact } from "../../src/tools/impact.js";

describe("MCP Inference Tool Handlers", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = path.join(process.cwd(), ".kb-test-mcp-inference");

    await fs.rm(testKbPath, { recursive: true, force: true });
    await fs.mkdir(testKbPath, { recursive: true });

    prolog = new PrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );
    await prolog.query(`kb_attach('${testKbPath}')`);

    await seedGraph(prolog);
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }

    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  test("kb_derive transitively_implements returns deterministic rows", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "transitively_implements",
      params: { req: "req-base" },
    });

    expect(result.structuredContent.rule).toBe("transitively_implements");
    expect(result.structuredContent.count).toBeGreaterThanOrEqual(2);
    expect(result.structuredContent.rows[0]).toHaveProperty("symbol");
    expect(result.structuredContent.rows[0]).toHaveProperty("req", "req-base");
  });

  test("kb_derive transitively_depends traverses dependency chain", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "transitively_depends",
      params: { req1: "req-ui", req2: "req-base" },
    });

    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.rows[0]).toEqual({
      req1: "req-ui",
      req2: "req-base",
    });
  });

  test("kb_derive coverage_gap finds MUST gaps", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "coverage_gap",
      params: { req: "req-gap" },
    });

    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.rows[0]).toEqual({
      req: "req-gap",
      reason: "missing_scenario_and_test",
    });
  });

  test("kb_derive affected_symbols returns impacted symbols", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "affected_symbols",
      params: { req: "req-base" },
    });

    expect(result.structuredContent.count).toBeGreaterThanOrEqual(2);
    const symbols = result.structuredContent.rows.map(
      (row) => row.symbol as string,
    );
    expect(symbols).toContain("symbol-core");
    expect(symbols).toContain("symbol-via-test");
  });

  test("kb_derive stale supports max_age_days", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "stale",
      params: { max_age_days: 30 },
    });

    const staleIds = result.structuredContent.rows.map(
      (row) => row.entity as string,
    );
    expect(staleIds).toContain("req-legacy");
  });

  test("kb_derive orphaned returns symbols without links", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "orphaned",
      params: { symbol: "symbol-orphan" },
    });

    expect(result.structuredContent.rows).toEqual([
      { symbol: "symbol-orphan" },
    ]);
  });

  test("kb_derive conflicting returns ADR conflicts", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "conflicting",
    });

    expect(result.structuredContent.count).toBeGreaterThanOrEqual(1);
    expect(result.structuredContent.rows).toContainEqual({
      adr1: "adr-a",
      adr2: "adr-b",
    });
  });

  test("kb_derive deprecated_still_used returns symbols", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "deprecated_still_used",
      params: { adr: "adr-legacy" },
    });

    expect(result.structuredContent.rows[0]).toEqual({
      adr: "adr-legacy",
      symbols: ["symbol-core"],
    });
  });

  test("kb_derive current_adr returns active ADRs", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "current_adr",
      params: {},
    });

    expect(result.structuredContent.rule).toBe("current_adr");
    expect(result.structuredContent.count).toBeGreaterThanOrEqual(1);
    expect(result.structuredContent.rows).toContainEqual({
      id: "adr-a",
      title: "ADR A",
    });
  });

  test("kb_derive adr_chain returns temporal chain", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "adr_chain",
      params: { adr: "adr-legacy" },
    });

    expect(result.structuredContent.rule).toBe("adr_chain");
    expect(result.structuredContent.count).toBe(2);
    expect(result.structuredContent.rows).toContainEqual({
      id: "adr-legacy",
      title: "Legacy ADR",
      status: "deprecated",
    });
    expect(result.structuredContent.rows).toContainEqual({
      id: "adr-new",
      title: "New ADR",
      status: "active",
    });
  });

  test("kb_derive superseded_by returns direct successor", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "superseded_by",
      params: { adr: "adr-legacy" },
    });

    expect(result.structuredContent.rule).toBe("superseded_by");
    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.rows[0]).toEqual({
      adr: "adr-legacy",
      successor_id: "adr-new",
      successor_title: "New ADR",
    });
  });

  test("kb_derive domain_contradictions returns conflicting requirements", async () => {
    const result = await handleKbDerive(prolog, {
      rule: "domain_contradictions",
      params: {},
    });

    expect(result.structuredContent.rule).toBe("domain_contradictions");
    expect(result.structuredContent.count).toBe(1);
    expect(result.structuredContent.rows[0]).toEqual({
      reqA: "req-role-2",
      reqB: "req-role-3",
      reason: "Conflict on fact-user-role: fact-limit-2 vs fact-limit-3",
    });
  });

  test("kb_impact returns typed impacted entities", async () => {
    const result = await handleKbImpact(prolog, { entity: "req-base" });

    expect(result.structuredContent.entity).toBe("req-base");
    expect(result.structuredContent.count).toBeGreaterThan(0);
    expect(
      result.structuredContent.impacted.some((x) => x.id === "req-ui"),
    ).toBe(true);
  });

  test("kb_coverage_report (all) returns req and symbol stats", async () => {
    const result = await handleKbCoverageReport(prolog, {});

    expect(result.structuredContent.requested_type).toBe("all");
    expect(result.structuredContent.coverage.requirements).toBeDefined();
    expect(result.structuredContent.coverage.symbols).toBeDefined();
    expect(result.structuredContent.coverage.requirements?.gaps).toContainEqual(
      {
        req: "req-gap",
        reason: "missing_scenario_and_test",
      },
    );
  });

  test("kb_coverage_report accepts focused type filter", async () => {
    const result = await handleKbCoverageReport(prolog, { type: "symbol" });

    expect(result.structuredContent.requested_type).toBe("symbol");
    expect(result.structuredContent.coverage.symbols).toBeDefined();
    expect(result.structuredContent.coverage.requirements).toBeUndefined();
  });
});

async function seedGraph(prolog: PrologProcess): Promise<void> {
  const standardTime = "2026-02-20T00:00:00Z";
  const legacyTime = "2020-01-01T00:00:00Z";

  const goals = [
    `kb_assert_entity(req, [id='req-base', title="Base requirement", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference", priority=must])`,
    `kb_assert_entity(req, [id='req-ui', title="UI requirement", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(req, [id='req-gap', title="Gap requirement", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference", priority=must])`,
    `kb_assert_entity(req, [id='req-legacy', title="Legacy requirement", status=active, created_at="${legacyTime}", updated_at="${legacyTime}", source="test://inference"])`,
    `kb_assert_entity(req, [id='req-role-2', title="Users have max 2 roles", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(req, [id='req-role-3', title="Users have max 3 roles", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(test, [id='test-base', title="Test validates base", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(symbol, [id='symbol-core', title="Core symbol", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(symbol, [id='symbol-via-test', title="Symbol tested against base", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(symbol, [id='symbol-orphan', title="Orphan symbol", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(symbol, [id='symbol-conflict', title="Conflict symbol", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(adr, [id='adr-legacy', title="Legacy ADR", status=deprecated, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(adr, [id='adr-a', title="ADR A", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(adr, [id='adr-b', title="ADR B", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(adr, [id='adr-new', title="New ADR", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(fact, [id='fact-user-role', title="User Role Assignment", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(fact, [id='fact-limit-2', title="Maximum of Two", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    `kb_assert_entity(fact, [id='fact-limit-3', title="Maximum of Three", status=active, created_at="${standardTime}", updated_at="${standardTime}", source="test://inference"])`,
    "kb_assert_relationship(depends_on, 'req-ui', 'req-base', [])",
    "kb_assert_relationship(validates, 'test-base', 'req-base', [])",
    "kb_assert_relationship(implements, 'symbol-core', 'req-base', [])",
    "kb_assert_relationship(covered_by, 'symbol-via-test', 'test-base', [])",
    "kb_assert_relationship(constrained_by, 'symbol-core', 'adr-legacy', [])",
    "kb_assert_relationship(constrained_by, 'symbol-conflict', 'adr-a', [])",
    "kb_assert_relationship(constrained_by, 'symbol-conflict', 'adr-b', [])",
    "kb_assert_relationship(supersedes, 'adr-new', 'adr-legacy', [])",
    "kb_assert_relationship(constrains, 'req-role-2', 'fact-user-role', [])",
    "kb_assert_relationship(constrains, 'req-role-3', 'fact-user-role', [])",
    "kb_assert_relationship(requires_property, 'req-role-2', 'fact-limit-2', [])",
    "kb_assert_relationship(requires_property, 'req-role-3', 'fact-limit-3', [])",
  ];

  const result = await prolog.query(goals);
  if (!result.success) {
    throw new Error(result.error || "Failed to seed inference graph");
  }

  await prolog.query("kb_save");
}
```

## File: packages/mcp/tests/tools/list-types.test.ts
```typescript
import { describe, expect, test } from "bun:test";
import {
  handleKbListEntityTypes,
  handleKbListRelationshipTypes,
} from "../../src/tools/list-types.js";

describe("List Types Tools", () => {
  describe("handleKbListEntityTypes", () => {
    test("should return correct structure", async () => {
      const result = await handleKbListEntityTypes();

      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("structuredContent");
      expect(result.content).toBeArray();
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.content[0]).toHaveProperty("text");
      expect(result.structuredContent).toHaveProperty("types");
      expect(result.structuredContent.types).toBeArray();
    });

    test("should return expected entity types", async () => {
      const result = await handleKbListEntityTypes();
      const types = result.structuredContent.types;

      const expectedTypes = [
        "req",
        "scenario",
        "test",
        "adr",
        "flag",
        "event",
        "symbol",
        "fact",
      ];

      expect(types).toEqual(expectedTypes);
    });
  });

  describe("handleKbListRelationshipTypes", () => {
    test("should return correct structure", async () => {
      const result = await handleKbListRelationshipTypes();

      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("structuredContent");
      expect(result.content).toBeArray();
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.content[0]).toHaveProperty("text");
      expect(result.structuredContent).toHaveProperty("types");
      expect(result.structuredContent.types).toBeArray();
    });

    test("should return expected relationship types", async () => {
      const result = await handleKbListRelationshipTypes();
      const types = result.structuredContent.types;

      const expectedTypes = [
        "depends_on",
        "specified_by",
        "verified_by",
        "validates",
        "implements",
        "covered_by",
        "constrained_by",
        "constrains",
        "requires_property",
        "guards",
        "publishes",
        "consumes",
        "supersedes",
        "relates_to",
      ];

      expect(types).toEqual(expectedTypes);
    });
  });
});
```

## File: packages/mcp/tests/tools/prolog-list.test.ts
```typescript
import { describe, expect, test } from "bun:test";
import {
  parseAtomList,
  parsePairList,
  parseTriples,
} from "../../src/tools/prolog-list.js";

describe("Prolog List Parser", () => {
  describe("parseAtomList", () => {
    test("should handle empty input", () => {
      expect(parseAtomList("")).toEqual([]);
      expect(parseAtomList("   ")).toEqual([]);
      expect(parseAtomList("[]")).toEqual([]);
    });

    test("should parse simple atoms", () => {
      expect(parseAtomList("[a,b,c]")).toEqual(["a", "b", "c"]);
      expect(parseAtomList("[foo, bar, baz]")).toEqual(["foo", "bar", "baz"]);
    });

    test("should parse quoted atoms", () => {
      expect(parseAtomList("['a', 'b', 'c']")).toEqual(["a", "b", "c"]);
      expect(parseAtomList('["a", "b", "c"]')).toEqual(["a", "b", "c"]);
    });

    test("should handle mixed quotes and atoms", () => {
      expect(parseAtomList("[a, 'b', \"c\"]")).toEqual(["a", "b", "c"]);
    });

    test("should handle atoms with special characters", () => {
      expect(parseAtomList("['foo bar', 'baz-qux']")).toEqual([
        "foo bar",
        "baz-qux",
      ]);
      expect(parseAtomList('["hello, world", "test"]')).toEqual([
        "hello, world",
        "test",
      ]);
    });

    test("should handle nested lists (as strings)", () => {
      // The implementation of splitTopLevel suggests it respects brackets/parens depth
      // but parseAtomList might just treat the nested list as a string token if it doesn't recurse.
      // Let's verify expected behavior based on code reading:
      // splitTopLevel splits by comma at top level.
      // So [a, [b,c], d] -> "a", "[b,c]", "d"
      // Then stripQuotes is applied.
      expect(parseAtomList("[a, [b,c], d]")).toEqual(["a", "[b,c]", "d"]);
    });
  });

  describe("parsePairList", () => {
    test("should handle empty input", () => {
      expect(parsePairList("")).toEqual([]);
      expect(parsePairList("[]")).toEqual([]);
    });

    test("should parse simple pairs", () => {
      expect(parsePairList("[[a,b], [c,d]]")).toEqual([
        ["a", "b"],
        ["c", "d"],
      ]);
    });

    test("should handle whitespace", () => {
      expect(parsePairList(" [ [ a , b ] , [ c , d ] ] ")).toEqual([
        ["a", "b"],
        ["c", "d"],
      ]);
    });

    test("should parse mixed quotes", () => {
      expect(parsePairList("[['a', \"b\"], [c, 'd']]")).toEqual([
        ["a", "b"],
        ["c", "d"],
      ]);
    });

    test("should ignore incomplete pairs", () => {
      // parsePairList checks if parts.length >= 2
      expect(parsePairList("[[a], [b,c], [d]]")).toEqual([["b", "c"]]);
    });

    test("should take first two elements of longer lists", () => {
      // parsePairList takes parts[0] and parts[1]
      expect(parsePairList("[[a,b,c]]")).toEqual([["a", "b"]]);
    });
  });

  describe("parseTriples", () => {
    test("should handle empty input", () => {
      expect(parseTriples("")).toEqual([]);
      expect(parseTriples("[]")).toEqual([]);
    });

    test("should parse simple triples", () => {
      expect(parseTriples("[[a,b,c], [d,e,f]]")).toEqual([
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });

    test("should handle mixed quotes", () => {
      expect(parseTriples("[['a', \"b\", c]]")).toEqual([["a", "b", "c"]]);
    });

    test("should ignore incomplete triples", () => {
      // parseTriples checks if parts.length >= 3
      expect(parseTriples("[[a,b], [c,d,e]]")).toEqual([["c", "d", "e"]]);
    });

    test("should take first three elements of longer lists", () => {
      expect(parseTriples("[[a,b,c,d]]")).toEqual([["a", "b", "c"]]);
    });
  });
});
```

## File: packages/mcp/tests/tools/query-relationships.test.ts
```typescript
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";
import { handleKbQueryRelationships } from "../../src/tools/query-relationships.js";

describe("MCP kb_query_relationships Tool Handler", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = path.join(process.cwd(), ".kb-test-mcp-query-rels");

    await fs.rm(testKbPath, { recursive: true, force: true });
    await fs.mkdir(testKbPath, { recursive: true });

    prolog = new PrologProcess();
    await prolog.start();

    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );

    const attachResult = await prolog.query(`kb_attach('${testKbPath}')`);
    expect(attachResult.success).toBe(true);

    // Seed: one req, one symbol that implements it, one test that the symbol is covered_by
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-rels-001",
      properties: {
        title: "Test requirement",
        status: "active",
        source: "/test/req.md",
        type: "req",
      },
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-rels-001",
      properties: {
        title: "testFunction",
        status: "active",
        source: "/test/src/main.ts",
        type: "symbol",
      },
      relationships: [
        { type: "implements", from: "SYM-rels-001", to: "REQ-rels-001" },
      ],
    });

    await handleKbUpsert(prolog, {
      type: "test",
      id: "TEST-rels-001",
      properties: {
        title: "testFunction unit test",
        status: "active",
        source: "/test/tests/main.test.ts",
        type: "test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-rels-001",
      properties: {
        title: "testFunction",
        status: "active",
        source: "/test/src/main.ts",
        type: "symbol",
      },
      relationships: [
        { type: "implements", from: "SYM-rels-001", to: "REQ-rels-001" },
        { type: "covered_by", from: "SYM-rels-001", to: "TEST-rels-001" },
      ],
    });
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.query("kb_detach");
      await prolog.terminate();
    }

    await fs.rm(testKbPath, { recursive: true, force: true });
  });

  test("should return empty list when no relationships exist for a non-existent id", async () => {
    const result = await handleKbQueryRelationships(prolog, {
      from: "NONEXISTENT-999",
    });

    expect(result.structuredContent?.count).toBe(0);
    expect(result.structuredContent?.relationships).toEqual([]);
    expect(result.content[0].text).toMatch(/No relationships found/);
  });

  test("should return relationships by source entity (from)", async () => {
    const result = await handleKbQueryRelationships(prolog, {
      from: "SYM-rels-001",
    });

    expect(result.structuredContent?.count).toBeGreaterThanOrEqual(1);

    const rels = result.structuredContent?.relationships ?? [];
    expect(rels.every((r) => r.from === "SYM-rels-001")).toBe(true);
  });

  test("should return relationships by target entity (to)", async () => {
    const result = await handleKbQueryRelationships(prolog, {
      to: "REQ-rels-001",
    });

    expect(result.structuredContent?.count).toBeGreaterThanOrEqual(1);

    const rels = result.structuredContent?.relationships ?? [];
    expect(rels.some((r) => r.to === "REQ-rels-001")).toBe(true);
  });

  test("should filter by relationship type", async () => {
    const result = await handleKbQueryRelationships(prolog, {
      from: "SYM-rels-001",
      type: "implements",
    });

    const rels = result.structuredContent?.relationships ?? [];
    expect(rels.every((r) => r.relType === "implements")).toBe(true);
  });

  test("should find implements relationship from symbol to req", async () => {
    const result = await handleKbQueryRelationships(prolog, {
      from: "SYM-rels-001",
      to: "REQ-rels-001",
    });

    const rels = result.structuredContent?.relationships ?? [];
    expect(rels.some((r) => r.relType === "implements")).toBe(true);
  });

  test("should find covered_by relationship from symbol to test", async () => {
    const result = await handleKbQueryRelationships(prolog, {
      from: "SYM-rels-001",
      type: "covered_by",
    });

    const rels = result.structuredContent?.relationships ?? [];
    expect(rels.some((r) => r.to === "TEST-rels-001")).toBe(true);
  });

  test("should reject invalid relationship type", async () => {
    await expect(
      handleKbQueryRelationships(prolog, { type: "nonexistent_type" }),
    ).rejects.toThrow(/Invalid relationship type/);
  });

  test("should return all relationships when no filter is applied", async () => {
    const result = await handleKbQueryRelationships(prolog, {});

    expect(result.structuredContent?.relationships).toBeInstanceOf(Array);
    expect(result.content[0].type).toBe("text");
  });

  test("response includes human-readable text summary", async () => {
    const result = await handleKbQueryRelationships(prolog, {
      from: "SYM-rels-001",
    });

    expect(result.content[0].text).toMatch(/relationship/i);
  });
});
```

## File: packages/mcp/tests/tools/query.test.ts
```typescript
import { describe, expect, test, mock } from "bun:test";
import {
  handleKbQuery,
  splitTopLevel,
  parsePrologValue,
  parsePropertyList,
  parseListOfLists,
  parseEntityFromBinding,
  parseEntityFromList,
  VALID_ENTITY_TYPES,
} from "../../src/tools/query.js";
import { PrologProcess } from "@kibi/cli/src/prolog.js";

describe("MCP kb.query Parsing Functions", () => {
  test("VALID_ENTITY_TYPES should be defined", () => {
    expect(VALID_ENTITY_TYPES).toBeArray();
    expect(VALID_ENTITY_TYPES.length).toBeGreaterThan(0);
  });
  describe("splitTopLevel", () => {
    test("should split simple strings", () => {
      expect(splitTopLevel("a,b,c", ",")).toEqual(["a", "b", "c"]);
    });

    test("should not split inside brackets", () => {
      expect(splitTopLevel("a,[b,c],d", ",")).toEqual(["a", "[b,c]", "d"]);
    });

    test("should not split inside quotes", () => {
      expect(splitTopLevel('a,"b,c",d', ",")).toEqual(["a", '"b,c"', "d"]);
    });

    test("should handle nested structures", () => {
      expect(splitTopLevel("a,[b,(c,d)],e", ",")).toEqual([
        "a",
        "[b,(c,d)]",
        "e",
      ]);
    });

    test("should handle escaped quotes", () => {
      // splitTopLevel handles escaped quotes by checking prevChar !== "\\"
      expect(splitTopLevel('a,"b\\"c,d",e', ",")).toEqual([
        "a",
        '"b\\"c,d"',
        "e",
      ]);
    });
  });

  describe("parsePrologValue", () => {
    test("should parse simple strings and atoms", () => {
      expect(parsePrologValue('"hello"')).toBe("hello");
      expect(parsePrologValue("'world'")).toBe("world");
      expect(parsePrologValue("atom")).toBe("atom");
    });

    test("should parse URIs", () => {
      expect(parsePrologValue("file:///path/to/file.md")).toBe("file.md");
    });

    test("should parse typed literals", () => {
      expect(parsePrologValue('^^("2023-01-01", "date")')).toBe("2023-01-01");
      expect(parsePrologValue('^^("[tag1,tag2]", "list")')).toEqual([
        "tag1",
        "tag2",
      ]);
      expect(parsePrologValue('^^("[]", "list")')).toEqual([]);
    });

    test("should parse lists", () => {
      expect(parsePrologValue("[a, b, c]")).toEqual(["a", "b", "c"]);
      expect(parsePrologValue("[]")).toEqual([]);
      expect(parsePrologValue('["a", "b"]')).toEqual(["a", "b"]);
    });

    test("should handle nested lists", () => {
      expect(parsePrologValue("[a, [b, c]]")).toEqual(["a", ["b", "c"]]);
    });
  });

  describe("parsePropertyList", () => {
    test("should parse simple property lists", () => {
      const input = '[id=1, title="Test"]';
      expect(parsePropertyList(input)).toEqual({
        id: "1",
        title: "Test",
      });
    });

    test("should skip ellipsis", () => {
      const input = "[id=1, ...]";
      expect(parsePropertyList(input)).toEqual({
        id: "1",
      });
    });

    test("should handle nested structures in values", () => {
      const input = "[id=1, tags=[a, b]]";
      expect(parsePropertyList(input)).toEqual({
        id: "1",
        tags: ["a", "b"],
      });
    });
  });

  describe("parseListOfLists", () => {
    test("should parse empty list", () => {
      expect(parseListOfLists("[]")).toEqual([]);
    });

    test("should parse single list", () => {
      expect(parseListOfLists("[[a,b,c]]")).toEqual([["a", "b", "c"]]);
    });

    test("should parse multiple lists", () => {
      expect(parseListOfLists("[[a,b,c],[d,e,f]]")).toEqual([
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });

    test("should handle complex elements", () => {
      const input = "[[id1, type1, [prop=val]], [id2, type2, [prop2=val2]]]";
      expect(parseListOfLists(input)).toEqual([
        ["id1", "type1", "[prop=val]"],
        ["id2", "type2", "[prop2=val2]"],
      ]);
    });
  });

  describe("parseEntityFromBinding and parseEntityFromList", () => {
    test("parseEntityFromBinding should parse binding string", () => {
      const input = '[abc123, req, [title="Test"]]';
      expect(parseEntityFromBinding(input)).toEqual({
        id: "abc123",
        type: "req",
        title: "Test",
      });
    });

    test("parseEntityFromList should parse data array", () => {
      const data = ["abc123", "req", '[title="Test"]'];
      expect(parseEntityFromList(data)).toEqual({
        id: "abc123",
        type: "req",
        title: "Test",
      });
    });
  });

  describe("handleKbQuery", () => {
    const mockProlog = {
      query: mock(async () => ({ success: true, bindings: {} })),
    } as unknown as PrologProcess;

    test("should generate correct goal for all entities", async () => {
      (mockProlog.query as any).mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[]" },
      });

      await handleKbQuery(mockProlog, {});
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
      );
    });

    test("should generate correct goal for type filter", async () => {
      (mockProlog.query as any).mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[]" },
      });

      await handleKbQuery(mockProlog, { type: "req" });
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall([Id,'req',Props], kb_entity(Id, 'req', Props), Results)",
      );
    });

    test("should generate correct goal for id and type filter", async () => {
      (mockProlog.query as any).mockResolvedValueOnce({
        success: true,
        bindings: { Result: '[id1, req, [title="T"]]' },
      });

      await handleKbQuery(mockProlog, { id: "id1", type: "req" });
      expect(mockProlog.query).toHaveBeenCalledWith(
        "kb_entity('id1', 'req', Props), Id = 'id1', Type = 'req', Result = [Id, Type, Props]",
      );
    });

    test("should generate correct goal for tags filter", async () => {
      (mockProlog.query as any).mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[]" },
      });

      await handleKbQuery(mockProlog, { tags: ["t1", "t2"] });
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall([Id,Type,Props], (kb_entity(Id, Type, Props), memberchk(tags=Tags, Props), member(Tag, Tags), member(Tag, ['t1','t2'])), Results)",
      );
    });

    test("should handle pagination (limit/offset)", async () => {
      const entities = Array.from(
        { length: 10 },
        (_, i) => `[id${i}, req, [title=\"T${i}\", status=\"active\"]]`,
      );
      (mockProlog.query as any).mockResolvedValueOnce({
        success: true,
        bindings: { Results: `[${entities.join(",")}]` },
      });

      const result = await handleKbQuery(mockProlog, { limit: 2, offset: 3 });

      expect(result.structuredContent?.count).toBe(10);
      expect(result.structuredContent?.entities.length).toBe(2);
      expect(result.structuredContent?.entities[0].id).toBe("id3");
      expect(result.structuredContent?.entities[1].id).toBe("id4");
    });

    test("should throw error on query failure", async () => {
      (mockProlog.query as any).mockResolvedValueOnce({
        success: false,
        error: "Prolog Error",
      });

      await expect(handleKbQuery(mockProlog, {})).rejects.toThrow(
        /Query execution failed: Prolog Error/,
      );
    });

    test("should throw error on invalid type", async () => {
      const invalidType = "invalid";
      await expect(
        handleKbQuery(mockProlog, { type: invalidType as any }),
      ).rejects.toThrow(
        `Invalid type '${invalidType}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}. Use a single type value, or omit this parameter to query all entities.`,
      );
    });
  });
});
```

## File: packages/mcp/tests/workspace.test.ts
```typescript
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  resolveWorkspaceRoot,
  resolveWorkspaceRootInfo,
  resolveKbPath,
  resolveEnvFilePath,
} from "../src/workspace.js";

describe("workspace utilities", () => {
  let tempDir: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-workspace-test-"));
    // Clear relevant env vars
    delete process.env.KIBI_WORKSPACE;
    delete process.env.KIBI_PROJECT_ROOT;
    delete process.env.KIBI_ROOT;
    delete process.env.KIBI_KB_PATH;
    delete process.env.KB_PATH;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    // Restore original environment
    for (const key in process.env) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  describe("resolveWorkspaceRoot", () => {
    test("should resolve from KIBI_WORKSPACE", () => {
      const target = path.join(tempDir, "target");
      fs.mkdirSync(target);
      process.env.KIBI_WORKSPACE = target;
      expect(resolveWorkspaceRoot(tempDir)).toBe(target);
    });

    test("should resolve from KIBI_PROJECT_ROOT", () => {
      const target = path.join(tempDir, "target");
      fs.mkdirSync(target);
      process.env.KIBI_PROJECT_ROOT = target;
      expect(resolveWorkspaceRoot(tempDir)).toBe(target);
    });

    test("should resolve from KIBI_ROOT", () => {
      const target = path.join(tempDir, "target");
      fs.mkdirSync(target);
      process.env.KIBI_ROOT = target;
      expect(resolveWorkspaceRoot(tempDir)).toBe(target);
    });

    test("should find .kb upwards", () => {
      const kbDir = path.join(tempDir, ".kb");
      fs.mkdirSync(kbDir);
      const subDir = path.join(tempDir, "a", "b", "c");
      fs.mkdirSync(subDir, { recursive: true });

      expect(resolveWorkspaceRoot(subDir)).toBe(tempDir);
    });

    test("should find .git upwards", () => {
      const gitDir = path.join(tempDir, ".git");
      fs.mkdirSync(gitDir);
      const subDir = path.join(tempDir, "a", "b", "c");
      fs.mkdirSync(subDir, { recursive: true });

      expect(resolveWorkspaceRoot(subDir)).toBe(tempDir);
    });

    test("should fallback to startDir", () => {
      expect(resolveWorkspaceRoot(tempDir)).toBe(path.resolve(tempDir));
    });
  });

  describe("resolveWorkspaceRootInfo", () => {
    test("should return 'env' reason", () => {
      process.env.KIBI_WORKSPACE = tempDir;
      const info = resolveWorkspaceRootInfo();
      expect(info.root).toBe(path.resolve(tempDir));
      expect(info.reason).toBe("env");
    });

    test("should return 'kb' reason", () => {
      fs.mkdirSync(path.join(tempDir, ".kb"));
      const info = resolveWorkspaceRootInfo(tempDir);
      expect(info.root).toBe(path.resolve(tempDir));
      expect(info.reason).toBe("kb");
    });

    test("should return 'git' reason", () => {
      fs.mkdirSync(path.join(tempDir, ".git"));
      const info = resolveWorkspaceRootInfo(tempDir);
      expect(info.root).toBe(path.resolve(tempDir));
      expect(info.reason).toBe("git");
    });

    test("should return 'cwd' reason", () => {
      const info = resolveWorkspaceRootInfo(tempDir);
      expect(info.root).toBe(path.resolve(tempDir));
      expect(info.reason).toBe("cwd");
    });
  });

  describe("resolveKbPath", () => {
    test("should resolve from KIBI_KB_PATH (absolute)", () => {
      const kbPath = path.join(tempDir, "custom-kb");
      process.env.KIBI_KB_PATH = kbPath;
      expect(resolveKbPath(tempDir, "main")).toBe(
        path.join(path.resolve(kbPath), "branches", "main"),
      );
    });

    test("should resolve from KIBI_KB_PATH (branch path)", () => {
      const kbPath = path.join(tempDir, "custom-kb", "branches", "feature");
      process.env.KIBI_KB_PATH = kbPath;
      expect(resolveKbPath(tempDir, "main")).toBe(path.resolve(kbPath));
    });

    test("should use default path", () => {
      const expected = path.join(tempDir, ".kb", "branches", "main");
      expect(resolveKbPath(tempDir, "main")).toBe(expected);
    });
  });

  describe("resolveEnvFilePath", () => {
    test("should handle absolute paths", () => {
      const absolutePath = path.join(tempDir, ".env.test");
      expect(resolveEnvFilePath(absolutePath, "/any")).toBe(absolutePath);
    });

    test("should handle relative paths", () => {
      const envFile = ".env.test";
      const expected = path.resolve(tempDir, envFile);
      expect(resolveEnvFilePath(envFile, tempDir)).toBe(expected);
    });
  });
});
```


---

#### 🔙 PREVIOUS PART: [kibi-02-tests-2.md](file:kibi-02-tests-2.md)

#### ⏭️ NEXT PART: [kibi-02-tests-4.md](file:kibi-02-tests-4.md)

> _End of Part 10_
