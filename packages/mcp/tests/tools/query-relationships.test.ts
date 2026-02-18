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
