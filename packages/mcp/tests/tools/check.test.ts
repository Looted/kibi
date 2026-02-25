import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/prolog";
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
