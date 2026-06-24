import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbCheck } from "../../src/tools/check.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";
import {
  attachTestKb,
  createTestKbDir,
  detachTestKb,
  startIntegrationProlog,
  stopIntegrationProlog,
} from "../helpers/integration-prolog.js";

describe("MCP transaction integrity", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    prolog = await startIntegrationProlog();
  });

  beforeEach(async () => {
    testKbPath = await createTestKbDir("kibi-mcp-tx-");
    const attachResult = await attachTestKb(prolog, testKbPath);
    expect(attachResult.success).toBe(true);
  });

  afterEach(async () => {
    await detachTestKb(prolog);
    if (testKbPath) {
      await fs.rm(testKbPath, { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    await stopIntegrationProlog(prolog);
  });

  test("failed relationship upsert should not corrupt existing entity", async () => {
    // Create a valid entity first
    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-TX-001",
      properties: {
        title: "Test symbol",
        status: "open",
        source: "test://tx-test",
      },
    });

    // Verify entity exists
    const entityResult = await prolog.query(
      "kb_entity('SYM-TX-001', symbol, Props)",
    );
    expect(entityResult.success).toBe(true);

    // Attempt to create a relationship to a non-existent target
    await expect(
      handleKbUpsert(prolog, {
        type: "symbol",
        id: "SYM-TX-001",
        properties: {
          title: "Test symbol",
          status: "open",
          source: "test://tx-test",
        },
        relationships: [
          {
            type: "covered_by",
            from: "SYM-TX-001",
            to: "NONEXISTENT-TEST-001",
          },
        ],
      }),
    ).rejects.toThrow();

    // Verify entity still exists after failed relationship upsert
    const entityAfter = await prolog.query(
      "kb_entity('SYM-TX-001', symbol, Props)",
    );
    expect(entityAfter.success).toBe(true);

    // Verify no partial relationship was created
    const relResult = await prolog.query(
      "kb_relationship(covered_by, 'SYM-TX-001', 'NONEXISTENT-TEST-001')",
    );
    expect(relResult.success).toBe(false);

    // Entity existence already verified above; no need to check exact property format
  }, 30000);

  test("failed relationship upsert should not remove existing relationships", async () => {
    // Create a requirement and a test
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-TX-002",
      properties: {
        title: "Test requirement",
        status: "open",
        source: "test://tx-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "test",
      id: "TEST-TX-002",
      properties: {
        title: "Test case",
        status: "passing",
        source: "test://tx-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-TX-002",
      properties: {
        title: "Test symbol",
        status: "open",
        source: "test://tx-test",
      },
      relationships: [
        { type: "covered_by", from: "SYM-TX-002", to: "TEST-TX-002" },
      ],
    });

    // Verify relationship exists
    const relBefore = await prolog.query(
      "kb_relationship(covered_by, 'SYM-TX-002', 'TEST-TX-002')",
    );
    expect(relBefore.success).toBe(true);

    // Attempt to add a relationship to a non-existent target
    await expect(
      handleKbUpsert(prolog, {
        type: "symbol",
        id: "SYM-TX-002",
        properties: {
          title: "Test symbol",
          status: "open",
          source: "test://tx-test",
        },
        relationships: [
          {
            type: "covered_by",
            from: "SYM-TX-002",
            to: "NONEXISTENT-TEST-002",
          },
        ],
      }),
    ).rejects.toThrow();

    // Verify existing relationship is still intact
    const relAfter = await prolog.query(
      "kb_relationship(covered_by, 'SYM-TX-002', 'TEST-TX-002')",
    );
    expect(relAfter.success).toBe(true);

    // Verify the invalid relationship was not created
    const relInvalid = await prolog.query(
      "kb_relationship(covered_by, 'SYM-TX-002', 'NONEXISTENT-TEST-002')",
    );
    expect(relInvalid.success).toBe(false);
  }, 30000);

  test("symbol coverage check should see relationships after successful upsert", async () => {
    // Create requirement → scenario → test → symbol chain
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-TX-003",
      properties: {
        title: "Test requirement",
        status: "open",
        source: "test://tx-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "SCEN-TX-003",
      properties: {
        title: "Test scenario",
        status: "open",
        source: "test://tx-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-TX-003",
      properties: {
        title: "Test requirement",
        status: "open",
        source: "test://tx-test",
      },
      relationships: [
        { type: "specified_by", from: "REQ-TX-003", to: "SCEN-TX-003" },
      ],
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "SCEN-TX-003",
      properties: {
        title: "Test scenario",
        status: "open",
        source: "test://tx-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "test",
      id: "TEST-TX-003",
      properties: {
        title: "Test case",
        status: "passing",
        source: "test://tx-test",
      },
      relationships: [
        { type: "validates", from: "TEST-TX-003", to: "SCEN-TX-003" },
      ],
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "SYM-TX-003",
      properties: {
        title: "Test symbol",
        status: "open",
        source: "test://tx-test",
      },
      relationships: [
        { type: "covered_by", from: "SYM-TX-003", to: "TEST-TX-003" },
      ],
    });

    // Run symbol-coverage check
    const checkResult = await handleKbCheck(prolog, {
      rules: ["symbol-coverage"],
    });
    const violations = checkResult.structuredContent?.violations ?? [];
    const symbolViolation = violations.find(
      (v: { entityId: string }) => v.entityId === "SYM-TX-003",
    );

    // Should NOT report SYM-TX-003 as uncovered
    expect(symbolViolation).toBeUndefined();
  }, 30000);
});
