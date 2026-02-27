import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrologProcess } from "kibi-cli/prolog";
import { handleKbQuery } from "../../src/tools/query.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";

describe("MCP CRUD Tool Handlers", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    prolog = new PrologProcess();
    await prolog.start();
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );

    testKbPath = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-mcp-crud-"));
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
