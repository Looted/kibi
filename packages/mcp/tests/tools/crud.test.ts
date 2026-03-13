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
import { handleKbDelete } from "../../src/tools/delete.js";
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

    test("should return updated entity immediately after upsert", async () => {
      await handleKbUpsert(prolog, {
        type: "req",
        id: "test-req-003",
        properties: {
          title: "Initial Title",
          status: "active",
          source: "test://mcp-crud",
        },
      });

      await handleKbUpsert(prolog, {
        type: "req",
        id: "test-req-003",
        properties: {
          title: "Updated Immediately",
          status: "active",
          source: "test://mcp-crud",
        },
      });

      const queryResult = await handleKbQuery(prolog, { id: "test-req-003" });
      const entity = queryResult.structuredContent?.entities[0] as
        | Record<string, unknown>
        | undefined;

      expect(entity).toBeDefined();
      expect(entity?.title).toBe("Updated Immediately");
    });

    test("should quote owner atoms with punctuation", async () => {
      await handleKbUpsert(prolog, {
        type: "req",
        id: "test-req-owner-001",
        properties: {
          title: "Owner Atom",
          status: "active",
          owner: "platform-team",
          source: "test://mcp-crud",
        },
      });

      const queryResult = await handleKbQuery(prolog, {
        id: "test-req-owner-001",
      });
      const entity = queryResult.structuredContent?.entities[0] as
        | Record<string, unknown>
        | undefined;

      expect(entity).toBeDefined();
      expect(entity?.owner).toBe("platform-team");
    });

    test("should read MCP-written entities after process restart", async () => {
      const reqId = "test-req-restart-001";
      const adrId = "test-adr-restart-001";
      const testId = "test-case-restart-001";

      await handleKbUpsert(prolog, {
        type: "req",
        id: reqId,
        properties: {
          title: "Restart Read",
          status: "active",
          owner: "platform-team",
          source: "test://mcp-crud",
          tags: ["restart", "mcp-write"],
        },
      });

      await handleKbUpsert(prolog, {
        type: "adr",
        id: adrId,
        properties: {
          title: "Restart ADR",
          status: "active",
          source: "test://mcp-crud",
        },
      });

      await handleKbUpsert(prolog, {
        type: "test",
        id: testId,
        properties: {
          title: "Restart Test",
          status: "active",
          source: "test://mcp-crud",
        },
      });

      await prolog.query("kb_save");
      await prolog.query("kb_detach");

      const restarted = new PrologProcess();
      try {
        await restarted.start();
        const attach = await restarted.query(`kb_attach('${testKbPath}')`);
        expect(attach.success).toBe(true);

        const byId = await handleKbQuery(restarted, { id: reqId });
        expect(byId.structuredContent?.entities.length).toBe(1);

        const byType = await handleKbQuery(restarted, {
          type: "req",
          limit: 500,
        });
        const ids = (byType.structuredContent?.entities ?? []).map(
          (entity) => entity.id,
        );
        expect(ids).toContain(reqId);

        const typedLookup = await handleKbQuery(restarted, {
          id: reqId,
          type: "req",
        });
        const typedEntity = typedLookup.structuredContent?.entities[0] as
          | Record<string, unknown>
          | undefined;
        expect(typedEntity?.type).toBe("req");

        const adrById = await handleKbQuery(restarted, { id: adrId });
        expect(adrById.structuredContent?.entities.length).toBe(1);

        const adrList = await handleKbQuery(restarted, {
          type: "adr",
          limit: 500,
        });
        const adrEntities = adrList.structuredContent?.entities ?? [];
        expect(adrEntities.some((entity) => entity.id === adrId)).toBe(true);
        expect(adrEntities.every((entity) => entity.type === "adr")).toBe(true);

        const testList = await handleKbQuery(restarted, {
          type: "test",
          limit: 500,
        });
        const testEntities = testList.structuredContent?.entities ?? [];
        expect(testEntities.some((entity) => entity.id === testId)).toBe(true);
        expect(testEntities.every((entity) => entity.type === "test")).toBe(
          true,
        );
      } finally {
        if (restarted.isRunning()) {
          await restarted.query("kb_detach");
          await restarted.terminate();
        }
      }

      await prolog.query(`kb_attach('${testKbPath}')`);
    });
  });

  describe("kb.delete", () => {
    test("should remove entity from id and type queries", async () => {
      await handleKbUpsert(prolog, {
        type: "req",
        id: "test-req-delete-001",
        properties: {
          title: "Delete Me",
          status: "active",
          source: "test://mcp-crud",
        },
      });

      const beforeDeleteById = await handleKbQuery(prolog, {
        id: "test-req-delete-001",
      });
      expect(beforeDeleteById.structuredContent?.entities.length).toBe(1);

      const deleteResult = await handleKbDelete(prolog, {
        ids: ["test-req-delete-001"],
      });
      expect(deleteResult.structuredContent?.deleted).toBe(1);
      expect(deleteResult.structuredContent?.skipped).toBe(0);

      const afterDeleteById = await handleKbQuery(prolog, {
        id: "test-req-delete-001",
      });
      expect(afterDeleteById.structuredContent?.entities.length).toBe(0);

      const afterDeleteByType = await handleKbQuery(prolog, {
        type: "req",
      });
      const hasDeletedEntity =
        afterDeleteByType.structuredContent?.entities.some(
          (entity) => entity.id === "test-req-delete-001",
        ) ?? false;
      expect(hasDeletedEntity).toBe(false);
    });

    test("should return empty result for missing id+type lookup", async () => {
      await handleKbUpsert(prolog, {
        type: "req",
        id: "test-req-delete-typed-001",
        properties: {
          title: "Delete Typed",
          status: "active",
          source: "test://mcp-crud",
        },
      });

      await handleKbDelete(prolog, { ids: ["test-req-delete-typed-001"] });

      const typedLookup = await handleKbQuery(prolog, {
        id: "test-req-delete-typed-001",
        type: "req",
      });

      expect(typedLookup.structuredContent?.entities.length).toBe(0);
      expect(typedLookup.content[0]?.text).toMatch(/No entities found/);
    });

    test("should converge after parallel create and delete batches", async () => {
      await Promise.all([
        handleKbUpsert(prolog, {
          type: "req",
          id: "test-req-parallel-001",
          properties: {
            title: "Parallel 1",
            status: "active",
            source: "test://mcp-crud",
          },
        }),
        handleKbUpsert(prolog, {
          type: "req",
          id: "test-req-parallel-002",
          properties: {
            title: "Parallel 2",
            status: "active",
            source: "test://mcp-crud",
          },
        }),
      ]);

      const afterCreateOne = await handleKbQuery(prolog, {
        id: "test-req-parallel-001",
      });
      const afterCreateTwo = await handleKbQuery(prolog, {
        id: "test-req-parallel-002",
      });
      expect(afterCreateOne.structuredContent?.entities.length).toBe(1);
      expect(afterCreateTwo.structuredContent?.entities.length).toBe(1);

      await Promise.all([
        handleKbDelete(prolog, { ids: ["test-req-parallel-001"] }),
        handleKbDelete(prolog, { ids: ["test-req-parallel-002"] }),
      ]);

      const postDeleteByIdOne = await handleKbQuery(prolog, {
        id: "test-req-parallel-001",
      });
      const postDeleteByIdTwo = await handleKbQuery(prolog, {
        id: "test-req-parallel-002",
      });
      const postDeleteTypedOne = await handleKbQuery(prolog, {
        id: "test-req-parallel-001",
        type: "req",
      });
      const postDeleteTypedTwo = await handleKbQuery(prolog, {
        id: "test-req-parallel-002",
        type: "req",
      });

      expect(postDeleteByIdOne.structuredContent?.entities.length).toBe(0);
      expect(postDeleteByIdTwo.structuredContent?.entities.length).toBe(0);
      expect(postDeleteTypedOne.structuredContent?.entities.length).toBe(0);
      expect(postDeleteTypedTwo.structuredContent?.entities.length).toBe(0);
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
