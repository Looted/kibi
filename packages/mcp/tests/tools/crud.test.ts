import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import { handleKbDelete } from "../../src/tools/delete.js";
import { handleKbQuery } from "../../src/tools/query.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";

describe("MCP CRUD Tool Handlers", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = path.join(process.cwd(), ".kb-test-mcp-crud");

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

  describe("kb.query", () => {
    test("should query all entities", async () => {
      const result = await handleKbQuery(prolog, {});

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe("text");
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent?.entities).toBeInstanceOf(Array);
      expect(result.structuredContent?.count).toBeGreaterThanOrEqual(0);
    });

    test("should query entities by type", async () => {
      const result = await handleKbQuery(prolog, { type: "req" });

      expect(result.structuredContent?.entities).toBeInstanceOf(Array);
    });

    test("should reject invalid entity type", async () => {
      await expect(
        handleKbQuery(prolog, { type: "invalid_type" }),
      ).rejects.toThrow(/Invalid type/);
    });

    test("should handle empty results", async () => {
      const result = await handleKbQuery(prolog, { type: "adr" });

      expect(result.structuredContent?.entities).toEqual([]);
      expect(result.structuredContent?.count).toBe(0);
    });

    test("should handle pagination with limit and offset", async () => {
      const result1 = await handleKbQuery(prolog, { limit: 5, offset: 0 });
      const result2 = await handleKbQuery(prolog, { limit: 5, offset: 5 });

      expect(result1.structuredContent?.entities.length).toBeLessThanOrEqual(5);
      expect(result2.structuredContent?.entities.length).toBeLessThanOrEqual(5);
    });

    test("should query by tag", async () => {
      const result = await handleKbQuery(prolog, { tags: ["test-tag"] });

      expect(result.structuredContent?.entities).toBeInstanceOf(Array);
    });
  });

  describe("kb.upsert", () => {
    test("should create a new entity", async () => {
      const entity = {
        id: "test-req-001",
        type: "req",
        title: "Test Requirement",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "test://mcp-crud",
        tags: ["test", "mcp"],
      };

      const result = await handleKbUpsert(prolog, { entities: [entity] });

      expect(result.structuredContent?.created).toBe(1);
      expect(result.structuredContent?.updated).toBe(0);
    });

    test("should update existing entity", async () => {
      const entity = {
        id: "test-req-001",
        type: "req",
        title: "Updated Test Requirement",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "test://mcp-crud",
        tags: ["test", "mcp", "updated"],
      };

      const result = await handleKbUpsert(prolog, { entities: [entity] });

      expect(result.structuredContent?.updated).toBe(1);
      expect(result.structuredContent?.created).toBe(0);
    });

    test("should create entity with relationships", async () => {
      const entity1 = {
        id: "test-req-002",
        type: "req",
        title: "Requirement 2",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "test://mcp-crud",
      };

      const entity2 = {
        id: "test-scenario-001",
        type: "scenario",
        title: "Scenario 1",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "test://mcp-crud",
      };

      const relationship = {
        type: "specified_by",
        from: "test-scenario-001",
        to: "test-req-002",
      };

      const result = await handleKbUpsert(prolog, {
        entities: [entity1, entity2],
        relationships: [relationship],
      });

      expect(result.structuredContent?.created).toBe(2);
      expect(result.structuredContent?.relationships_created).toBe(1);
    });

    test("should reject entity with missing required fields", async () => {
      const invalidEntity = {
        id: "test-invalid",
        type: "req",
      };

      await expect(
        handleKbUpsert(prolog, { entities: [invalidEntity] }),
      ).rejects.toThrow(/validation failed/);
    });

    test("should reject entity with invalid type", async () => {
      const invalidEntity = {
        id: "test-invalid-type",
        type: "invalid_type",
        title: "Invalid",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "test://mcp-crud",
      };

      await expect(
        handleKbUpsert(prolog, { entities: [invalidEntity] }),
      ).rejects.toThrow(/validation failed/);
    });

    test("should reject empty entities array", async () => {
      await expect(handleKbUpsert(prolog, { entities: [] })).rejects.toThrow(
        /At least one entity required/,
      );
    });
  });

  describe("kb.delete", () => {
    test("should delete existing entity", async () => {
      const entity = {
        id: "test-delete-001",
        type: "flag",
        title: "To Be Deleted",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "test://mcp-crud",
      };

      await handleKbUpsert(prolog, { entities: [entity] });

      const result = await handleKbDelete(prolog, { ids: ["test-delete-001"] });

      expect(result.structuredContent?.deleted).toBe(1);
      expect(result.structuredContent?.skipped).toBe(0);
    });

    test("should skip non-existent entity", async () => {
      const result = await handleKbDelete(prolog, {
        ids: ["non-existent-id"],
      });

      expect(result.structuredContent?.deleted).toBe(0);
      expect(result.structuredContent?.skipped).toBe(1);
      expect(result.structuredContent?.errors).toContain(
        "Entity non-existent-id does not exist",
      );
    });

    test("should prevent deletion of entity with dependents", async () => {
      const parentEntity = {
        id: "test-parent-001",
        type: "req",
        title: "Parent Requirement",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "test://mcp-crud",
      };

      const childEntity = {
        id: "test-child-001",
        type: "scenario",
        title: "Child Scenario",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "test://mcp-crud",
      };

      await handleKbUpsert(prolog, {
        entities: [parentEntity, childEntity],
        relationships: [
          {
            type: "specified_by",
            from: "test-child-001",
            to: "test-parent-001",
          },
        ],
      });

      const result = await handleKbDelete(prolog, {
        ids: ["test-parent-001"],
      });

      expect(result.structuredContent?.deleted).toBe(0);
      expect(result.structuredContent?.skipped).toBe(1);
      expect(result.structuredContent?.errors[0]).toContain("has dependents");
    });

    test("should delete multiple entities", async () => {
      const entity1 = {
        id: "test-multi-delete-001",
        type: "event",
        title: "Event 1",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "test://mcp-crud",
      };

      const entity2 = {
        id: "test-multi-delete-002",
        type: "event",
        title: "Event 2",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "test://mcp-crud",
      };

      await handleKbUpsert(prolog, { entities: [entity1, entity2] });

      const result = await handleKbDelete(prolog, {
        ids: ["test-multi-delete-001", "test-multi-delete-002"],
      });

      expect(result.structuredContent?.deleted).toBe(2);
      expect(result.structuredContent?.skipped).toBe(0);
    });

    test("should reject empty ids array", async () => {
      await expect(handleKbDelete(prolog, { ids: [] })).rejects.toThrow(
        /At least one ID required/,
      );
    });
  });

  describe("integration: query after upsert", () => {
    test("should find entity immediately after creation", async () => {
      const entity = {
        id: "test-integration-001",
        type: "symbol",
        title: "Integration Test Symbol",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source: "test://integration",
        tags: ["integration"],
      };

      await handleKbUpsert(prolog, { entities: [entity] });

      const queryResult = await handleKbQuery(prolog, {
        id: "test-integration-001",
      });

      expect(queryResult.structuredContent?.entities.length).toBe(1);
      expect(queryResult.structuredContent?.entities[0].id).toBe(
        "test-integration-001",
      );
      expect(queryResult.structuredContent?.entities[0].title).toBe(
        "Integration Test Symbol",
      );
    });
  });
});
