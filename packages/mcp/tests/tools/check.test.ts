import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import type { PrologProcess } from "kibi-cli/prolog";
import type { Violation } from "kibi-cli/public/check-types";
import { handleKbCheck } from "../../src/tools/check.js";
import { resolveCorePlPath } from "../../src/tools/core-module.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";
import {
  attachTestKb,
  createTestKbDir,
  detachTestKb,
  startIntegrationProlog,
  stopIntegrationProlog,
} from "../helpers/integration-prolog.js";

async function createBroadQualityFixture(prolog: PrologProcess): Promise<void> {
  await handleKbUpsert(prolog, {
    type: "req",
    id: "REQ-BROAD-MCP-001",
    properties: {
      title: "Broad MCP audit requirement",
      status: "open",
      priority: "should",
      source: "documentation/requirements/REQ-BROAD-MCP-001.md",
    },
  });

  for (const ordinal of Array.from({ length: 9 }, (_, index) => index + 1)) {
    const testId = `TEST-BROAD-MCP-${String(ordinal).padStart(3, "0")}`;
    await handleKbUpsert(prolog, {
      type: "test",
      id: testId,
      properties: {
        title: `Broad MCP test ${ordinal}`,
        status: "passing",
        source: `documentation/tests/${testId}.md`,
      },
      relationships: [
        { type: "validates", from: testId, to: "REQ-BROAD-MCP-001" },
      ],
    });
  }

  await handleKbUpsert(prolog, {
    type: "req",
    id: "REQ-BROAD-MCP-001",
    properties: {
      title: "Broad MCP audit requirement",
      status: "open",
      priority: "should",
      source: "documentation/requirements/REQ-BROAD-MCP-001.md",
    },
    relationships: Array.from({ length: 9 }, (_, index) => {
      const ordinal = index + 1;
      return {
        type: "verified_by" as const,
        from: "REQ-BROAD-MCP-001",
        to: `TEST-BROAD-MCP-${String(ordinal).padStart(3, "0")}`,
      };
    }),
  });
}

async function createCoverageDepthQualityFixture(
  prolog: PrologProcess,
): Promise<void> {
  await handleKbUpsert(prolog, {
    type: "test",
    id: "TEST-COVERAGE-MCP-UNIT-001",
    properties: {
      title: "Unit coverage MCP test",
      status: "passing",
      source: "documentation/tests/TEST-COVERAGE-MCP-UNIT-001.md",
      verification_scope: "unit",
    },
  });

  await handleKbUpsert(prolog, {
    type: "req",
    id: "REQ-COVERAGE-MCP-UNIT-001",
    properties: {
      title: "Unit-only MCP coverage requirement",
      status: "open",
      priority: "should",
      source: "documentation/requirements/REQ-COVERAGE-MCP-UNIT-001.md",
    },
    relationships: [
      {
        type: "verified_by",
        from: "REQ-COVERAGE-MCP-UNIT-001",
        to: "TEST-COVERAGE-MCP-UNIT-001",
      },
    ],
  });
}

describe("MCP Check Tool Handler", () => {
  let prolog: PrologProcess;
  let testKbPath: string;
  let previousWorkspace: string | undefined;
  let previousKibiBranch: string | undefined;

  beforeAll(async () => {
    prolog = await startIntegrationProlog();
  });

  beforeEach(async () => {
    testKbPath = await createTestKbDir("kibi-mcp-check-");
    const attachResult = await attachTestKb(prolog, testKbPath);
    expect(attachResult.success).toBe(true);
    previousWorkspace = process.env.KIBI_WORKSPACE;
    previousKibiBranch = process.env.KIBI_BRANCH;
    process.env.KIBI_WORKSPACE = testKbPath;
    process.env.KIBI_BRANCH = "main";
  });

  afterEach(async () => {
    await detachTestKb(prolog);
    if (previousWorkspace === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
    } else {
      process.env.KIBI_WORKSPACE = previousWorkspace;
    }
    if (previousKibiBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = previousKibiBranch;
    }
    if (testKbPath) {
      await fs.rm(testKbPath, { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    await stopIntegrationProlog(prolog);
  });

  test("should return no violations for empty KB", async () => {
    const result = await handleKbCheck(prolog, {});

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("No violations");
    expect(result.structuredContent?.violations).toEqual([]);
    expect(result.structuredContent?.count).toBe(0);
  }, 30000);

  test("returns full-check quality diagnostics in structured content and text", async () => {
    await createBroadQualityFixture(prolog);

    const result = await handleKbCheck(prolog, {});

    expect(result.structuredContent?.violations).toEqual([]);
    expect(result.structuredContent?.count).toBe(0);
    expect(result.structuredContent?.qualityDiagnostics).toContainEqual(
      expect.objectContaining({
        id: "broad_requirement_review",
        entityId: "REQ-BROAD-MCP-001",
        blocking: false,
      }),
    );
    expect(result.content[0].text).toContain("quality diagnostic");
    expect(result.content[0].text).toContain("broad_requirement_review");
  }, 30000);

  test("returns coverage depth quality diagnostics in structured content", async () => {
    await createCoverageDepthQualityFixture(prolog);

    const result = await handleKbCheck(prolog, {});

    expect(result.structuredContent?.violations).toEqual([]);
    expect(result.structuredContent?.count).toBe(0);
    expect(result.structuredContent?.qualityDiagnostics).toContainEqual(
      expect.objectContaining({
        id: "coverage_depth_review",
        entityId: "REQ-COVERAGE-MCP-UNIT-001",
        severity: "review",
        blocking: false,
        evidence: expect.objectContaining({
          coverageDepth: "unit_only",
          directTests: ["TEST-COVERAGE-MCP-UNIT-001"],
          verificationScopes: ["unit"],
        }),
      }),
    );
    expect(result.content[0].text).toContain("coverage_depth_review");
  }, 30000);

  test("caps full-check quality diagnostics deterministically", async () => {
    await createBroadQualityFixture(prolog);
    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-STATUS-MCP-001",
      properties: {
        title: "Requirement with test status",
        status: "passing",
        source: "documentation/requirements/REQ-STATUS-MCP-001.md",
      },
    });

    const result = await handleKbCheck(prolog, { maxDiagnostics: 1 });

    expect(result.structuredContent?.qualityDiagnostics).toHaveLength(1);
    expect(result.structuredContent?.qualityDiagnostics?.[0]?.id).toBe(
      "broad_requirement_review",
    );
  }, 30000);

  test("should detect must-priority requirement without scenario", async () => {
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-must-001",
      properties: {
        title: "Must-priority requirement",
        status: "open",
        priority: "must",
        source: "test://check-test",
        logic_claims: ["CLAIM-0C248B336120EB89"],
        semantic_inventory_version: "kibi.semantic-inventory.v1",
        semantic_source_field: "title",
        semantic_source_hash:
          "c15bb19f1f346cb111d0af0f0bf2ad523ed6341e6dd7fb09ea8f7f2bdcfeb3a6",
        semantic_inventory: [
          {
            claim_key: "CLAIM-0C248B336120EB89",
            claim_text: "Must-priority requirement",
            role: "normative",
            status: "ontology_gap",
            span: { start: 0, end: 25 },
          },
        ],
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
  }, 15000);

  test("should detect must-priority requirement with scenario but no test", async () => {
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-001",
      properties: {
        title: "Scenario for must req",
        status: "open",
        source: "test://check-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-must-001",
      properties: {
        title: "Must-priority requirement",
        status: "open",
        priority: "must",
        source: "test://check-test",
        logic_claims: ["CLAIM-0C248B336120EB89"],
        semantic_inventory_version: "kibi.semantic-inventory.v1",
        semantic_source_field: "title",
        semantic_source_hash:
          "c15bb19f1f346cb111d0af0f0bf2ad523ed6341e6dd7fb09ea8f7f2bdcfeb3a6",
        semantic_inventory: [
          {
            claim_key: "CLAIM-0C248B336120EB89",
            claim_text: "Must-priority requirement",
            role: "normative",
            status: "ontology_gap",
            span: { start: 0, end: 25 },
          },
        ],
      },
      relationships: [
        {
          type: "specified_by",
          from: "req-must-001",
          to: "scenario-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {});

    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "must-priority-coverage" && v.entityId === "req-must-001",
    );
    expect(violation).toBeDefined();
    expect(violation?.description).toContain("test");
    expect(violation?.description).not.toContain("scenario");
  }, 15000);

  test("should pass must-priority coverage with both scenario and test", async () => {
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-001",
      properties: {
        title: "Scenario for must req",
        status: "open",
        source: "test://check-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-must-001",
      properties: {
        title: "Must-priority requirement",
        status: "open",
        priority: "must",
        source: "test://check-test",
        logic_claims: ["CLAIM-0C248B336120EB89"],
        semantic_inventory_version: "kibi.semantic-inventory.v1",
        semantic_source_field: "title",
        semantic_source_hash:
          "c15bb19f1f346cb111d0af0f0bf2ad523ed6341e6dd7fb09ea8f7f2bdcfeb3a6",
        semantic_inventory: [
          {
            claim_key: "CLAIM-0C248B336120EB89",
            claim_text: "Must-priority requirement",
            role: "normative",
            status: "ontology_gap",
            span: { start: 0, end: 25 },
          },
        ],
      },
      relationships: [
        {
          type: "specified_by",
          from: "req-must-001",
          to: "scenario-001",
        },
      ],
    });

    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-001",
      properties: {
        title: "Test for must req",
        status: "passing",
        source: "test://check-test",
      },
      relationships: [
        {
          type: "validates",
          from: "test-001",
          to: "req-must-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {});

    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "must-priority-coverage" && v.entityId === "req-must-001",
    );
    expect(violation).toBeUndefined();
  }, 15000);

  test("should run required-fields rule without errors", async () => {
    await handleKbUpsert(prolog, {
      type: "req",
      id: "complete-req-001",
      properties: {
        title: "Complete requirement",
        status: "open",
        source: "test://check-test",
      },
    });

    const result = await handleKbCheck(prolog, {
      rules: ["required-fields"],
    });

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.violations).toBeInstanceOf(Array);
  }, 15000);

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
  }, 15000);

  test("should run no-dangling-refs rule without errors", async () => {
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-valid-001",
      properties: {
        title: "Valid requirement",
        status: "open",
        source: "test://check-test",
      },
    });

    const result = await handleKbCheck(prolog, {
      rules: ["no-dangling-refs"],
    });

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.violations).toBeInstanceOf(Array);
  }, 15000);

  test("should run no-cycles rule without errors", async () => {
    const relationship = {
      type: "depends_on",
      from: "req-nocycle-b",
      to: "req-nocycle-a",
    };

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-nocycle-a",
      properties: {
        title: "Requirement A",
        status: "open",
        source: "test://check-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-nocycle-b",
      properties: {
        title: "Requirement B",
        status: "open",
        source: "test://check-test",
      },
      relationships: [relationship],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["no-cycles"],
    });

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.violations).toBeInstanceOf(Array);
  }, 15000);

  test("should detect symbol without requirement coverage", async () => {
    // Create a symbol without any implements relationship to a requirement
    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-uncovered-001",
      properties: {
        title: "Uncovered symbol",
        status: "active",
        source: "test://check-test",
      },
    });

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-coverage"],
    });

    expect(result.structuredContent).toBeDefined();
    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "symbol-coverage" && v.entityId === "symbol-uncovered-001",
    );
    expect(violation).toBeDefined();
    expect(violation?.description).toMatch(/qualifying requirement coverage/i);
    expect(violation?.suggestion).toContain("covered_by");
    expect(violation?.suggestion).toMatch(/scenario|fallback/i);
  }, 15000);

  test("should fail symbol coverage when symbol only implements requirement", async () => {
    // Ownership alone should not satisfy coverage.
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-for-symbol-001",
      properties: {
        title: "Requirement for symbol",
        status: "open",
        source: "test://check-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-covered-001",
      properties: {
        title: "Covered symbol",
        status: "active",
        source: "test://check-test",
      },
      relationships: [
        {
          type: "implements",
          from: "symbol-covered-001",
          to: "req-for-symbol-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-coverage"],
    });

    expect(result.structuredContent).toBeDefined();
    const violation = result.structuredContent?.violations.find(
      (v) => v.entityId === "symbol-covered-001",
    );
    expect(violation).toBeDefined();
  }, 15000);

  test("should complete kb_check on a larger MCP-written dataset", async () => {
    // Create 10 entities (reduced for CI performance)
    for (let i = 0; i < 10; i++) {
      await handleKbUpsert(prolog, {
        type: "req",
        id: `req-load-${i.toString().padStart(3, "0")}`,
        properties: {
          title: `Load Req ${i}`,
          status: "open",
          source: "test://check-load",
        },
        _skipContradictionCheck: true,
      });
    }

    const result = await handleKbCheck(prolog, {});

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.violations).toBeInstanceOf(Array);
  }, 20000);

  test("should detect symbol-traceability violations", async () => {
    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-notrace-001",
      properties: {
        title: "Symbol without traceability",
        status: "active",
        source: "test://traceability",
      },
    });

    const result = await handleKbCheck(prolog, {});

    expect(result.structuredContent).toBeDefined();
    const traceabilityViolation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "symbol-traceability" && v.entityId === "symbol-notrace-001",
    );
    expect(traceabilityViolation).toBeDefined();
    expect(traceabilityViolation?.description).toMatch(
      /direct requirement ownership/i,
    );
    expect(traceabilityViolation?.suggestion).toMatch(/implements/i);
    expect(traceabilityViolation?.suggestion).toMatch(/executable_for/i);
    expect(traceabilityViolation?.suggestion).toMatch(/covered_by/i);
  }, 15000);

  test("should pass symbol-traceability when symbol implements requirement", async () => {
    // Create a requirement and a symbol with implements relationship
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-traceability-pass-001",
      properties: {
        title: "Requirement for passing traceability",
        status: "open",
        source: "test://traceability-pass",
      },
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-trace-pass-001",
      properties: {
        title: "Symbol with traceability",
        status: "active",
        source: "test://traceability-pass",
      },
      relationships: [
        {
          type: "implements",
          from: "symbol-trace-pass-001",
          to: "req-traceability-pass-001",
        },
      ],
    });

    // Run check with symbol-traceability rule
    const result = await handleKbCheck(prolog, {
      rules: ["symbol-traceability"],
    });

    expect(result.structuredContent).toBeDefined();
    // Should have no violations for our symbol
    const symbolViolation = result.structuredContent?.violations.find(
      (v) => v.entityId === "symbol-trace-pass-001",
    );
    expect(symbolViolation).toBeUndefined();
  }, 15000);

  // Truth-table matrix:
  // - dead code = missing production ownership (`implements`) for symbol-traceability
  // - untested code = missing `covered_by` evidence
  // - uncovered code = `covered_by` exists but no canonical requirement/scenario path

  test("should fail symbol-traceability when symbol is only covered by validating test", async () => {
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-trace-validates-001",
      properties: {
        title: "Requirement for validating test traceability",
        status: "open",
        source: "test://traceability-validates",
      },
    });

    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-trace-validates-001",
      properties: {
        title: "Validating traceability test",
        status: "passing",
        source: "test://traceability-validates",
      },
      relationships: [
        {
          type: "validates",
          from: "test-trace-validates-001",
          to: "req-trace-validates-001",
        },
      ],
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-trace-validates-001",
      properties: {
        title: "Symbol covered by validating test",
        status: "active",
        source: "test://traceability-validates",
      },
      relationships: [
        {
          type: "covered_by",
          from: "symbol-trace-validates-001",
          to: "test-trace-validates-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-traceability"],
    });

    const symbolViolation = result.structuredContent?.violations.find(
      (v) => v.entityId === "symbol-trace-validates-001",
    );
    expect(symbolViolation).toBeDefined();
    expect(symbolViolation?.description).toMatch(
      /direct requirement ownership/i,
    );
  }, 15000);

  test("should fail symbol-traceability when requirement is only verified by covering test", async () => {
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-trace-verified-001",
      properties: {
        title: "Verified traceability test",
        status: "passing",
        source: "test://traceability-verified",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-trace-verified-001",
      properties: {
        title: "Requirement verified by test traceability",
        status: "open",
        source: "test://traceability-verified",
      },
      relationships: [
        {
          type: "verified_by",
          from: "req-trace-verified-001",
          to: "test-trace-verified-001",
        },
      ],
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-trace-verified-001",
      properties: {
        title: "Symbol covered by verified test",
        status: "active",
        source: "test://traceability-verified",
      },
      relationships: [
        {
          type: "covered_by",
          from: "symbol-trace-verified-001",
          to: "test-trace-verified-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-traceability"],
    });

    const symbolViolation = result.structuredContent?.violations.find(
      (v) => v.entityId === "symbol-trace-verified-001",
    );
    expect(symbolViolation).toBeDefined();
    expect(symbolViolation?.description).toMatch(
      /direct requirement ownership/i,
    );
  }, 15000);

  test("should pass symbol-traceability when symbol is only executable_for a test", async () => {
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-trace-executable-001",
      properties: {
        title: "Executable traceability test",
        status: "passing",
        source: "test://traceability-executable",
      },
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-trace-executable-001",
      properties: {
        title: "Symbol executable for test only",
        status: "active",
        source: "test://traceability-executable",
      },
    });

    const relResult = await prolog.query(
      "kb_assert_relationship(executable_for, 'symbol-trace-executable-001', 'test-trace-executable-001', [])",
    );
    expect(relResult.success).toBe(true);

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-traceability"],
    });

    const symbolViolation = result.structuredContent?.violations.find(
      (v) => v.entityId === "symbol-trace-executable-001",
    );
    expect(symbolViolation).toBeUndefined();
  }, 15000);

  test("should pass symbol-coverage for direct req to test fallback without scenario", async () => {
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-coverage-direct-001",
      properties: {
        title: "Coverage direct fallback requirement",
        status: "open",
        source: "test://coverage-direct",
      },
    });

    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-coverage-direct-001",
      properties: {
        title: "Coverage direct fallback test",
        status: "passing",
        source: "test://coverage-direct",
      },
      relationships: [
        {
          type: "validates",
          from: "test-coverage-direct-001",
          to: "req-coverage-direct-001",
        },
      ],
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-coverage-direct-001",
      properties: {
        title: "Symbol covered through direct fallback",
        status: "active",
        source: "test://coverage-direct",
      },
      relationships: [
        {
          type: "covered_by",
          from: "symbol-coverage-direct-001",
          to: "test-coverage-direct-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-coverage"],
    });

    const symbolViolation = result.structuredContent?.violations.find(
      (v) => v.entityId === "symbol-coverage-direct-001",
    );
    expect(symbolViolation).toBeUndefined();
  }, 15000);

  test("should fail symbol-coverage direct req to test fallback when scenario exists", async () => {
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-coverage-001",
      properties: {
        title: "Coverage scenario",
        status: "active",
        source: "test://coverage-scenario",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-coverage-scenario-001",
      properties: {
        title: "Coverage scenario requirement",
        status: "open",
        source: "test://coverage-scenario",
      },
      relationships: [
        {
          type: "specified_by",
          from: "req-coverage-scenario-001",
          to: "scenario-coverage-001",
        },
      ],
    });

    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-coverage-scenario-001",
      properties: {
        title: "Coverage scenario test",
        status: "passing",
        source: "test://coverage-scenario",
      },
      relationships: [
        {
          type: "validates",
          from: "test-coverage-scenario-001",
          to: "req-coverage-scenario-001",
        },
      ],
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-coverage-scenario-001",
      properties: {
        title: "Symbol blocked by scenario-aware fallback",
        status: "active",
        source: "test://coverage-scenario",
      },
      relationships: [
        {
          type: "covered_by",
          from: "symbol-coverage-scenario-001",
          to: "test-coverage-scenario-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-coverage"],
    });

    const symbolViolation = result.structuredContent?.violations.find(
      (v) => v.entityId === "symbol-coverage-scenario-001",
    );
    expect(symbolViolation).toBeDefined();
  }, 15000);

  test("should still fail symbol-traceability for relates_to requirement links", async () => {
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-trace-relates-001",
      properties: {
        title: "Requirement only related to symbol",
        status: "open",
        source: "test://traceability-relates",
      },
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-trace-relates-001",
      properties: {
        title: "Symbol with relates_to only",
        status: "active",
        source: "test://traceability-relates",
      },
      relationships: [
        {
          type: "relates_to",
          from: "symbol-trace-relates-001",
          to: "req-trace-relates-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-traceability"],
    });

    const symbolViolation = result.structuredContent?.violations.find(
      (v) => v.entityId === "symbol-trace-relates-001",
    );
    expect(symbolViolation).toBeDefined();
    expect(symbolViolation?.description).toMatch(
      /direct requirement ownership/i,
    );
  }, 15000);

  test("should still fail symbol-traceability when covered test lacks requirement edge", async () => {
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-trace-missing-req-001",
      properties: {
        title: "Covered test without req edge",
        status: "passing",
        source: "test://traceability-missing-req",
      },
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-trace-missing-req-001",
      properties: {
        title: "Symbol covered by unlinked test",
        status: "active",
        source: "test://traceability-missing-req",
      },
      relationships: [
        {
          type: "covered_by",
          from: "symbol-trace-missing-req-001",
          to: "test-trace-missing-req-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-traceability"],
    });

    const symbolViolation = result.structuredContent?.violations.find(
      (v) => v.entityId === "symbol-trace-missing-req-001",
    );
    expect(symbolViolation).toBeDefined();
    expect(symbolViolation?.description).toMatch(
      /direct requirement ownership/i,
    );
  }, 15000);

  test("should run symbol-traceability rule without errors when filtering", async () => {
    // Create a requirement and symbol without relationship
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-filter-001",
      properties: {
        title: "Filter test requirement",
        status: "open",
        source: "test://filter-test",
      },
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-filter-001",
      properties: {
        title: "Filter test symbol",
        status: "active",
        source: "test://filter-test",
      },
    });

    // Run check with only symbol-traceability rule
    const result = await handleKbCheck(prolog, {
      rules: ["symbol-traceability"],
    });

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.violations).toBeInstanceOf(Array);
    // All violations should be symbol-traceability only
    const nonMatchingViolations = result.structuredContent?.violations.filter(
      (v) => v.rule !== "symbol-traceability",
    );
    expect(nonMatchingViolations?.length).toBe(0);
  }, 15000);

  test("should include all rules when no specific rules provided", async () => {
    // This test ensures the aggregated check path covers all rules
    // and doesn't early-return missing rules like symbol-traceability

    // Create entities that would trigger various violations
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-all-001",
      properties: {
        title: "Must-priority requirement",
        status: "open",
        priority: "must",
        source: "test://all-rules",
        logic_claims: ["CLAIM-0C248B336120EB89"],
        semantic_inventory_version: "kibi.semantic-inventory.v1",
        semantic_source_field: "title",
        semantic_source_hash:
          "c15bb19f1f346cb111d0af0f0bf2ad523ed6341e6dd7fb09ea8f7f2bdcfeb3a6",
        semantic_inventory: [
          {
            claim_key: "CLAIM-0C248B336120EB89",
            claim_text: "Must-priority requirement",
            role: "normative",
            status: "ontology_gap",
            span: { start: 0, end: 25 },
          },
        ],
      },
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-all-001",
      properties: {
        title: "Symbol without traceability",
        status: "active",
        source: "test://all-rules",
      },
      // No implements relationship - triggers symbol-traceability violation
    });

    // Run check without specific rules (should run all rules)
    const result = await handleKbCheck(prolog, {});

    expect(result.structuredContent).toBeDefined();
    expect(result.structuredContent?.violations).toBeInstanceOf(Array);

    const violations = result.structuredContent?.violations || [];

    // Check that we have both must-priority-coverage and symbol-traceability violations
    const mustPriorityViolation = violations.find(
      (v) => v.rule === "must-priority-coverage",
    );
    const symbolTraceabilityViolation = violations.find(
      (v) => v.rule === "symbol-traceability",
    );
    const symbolCoverageViolation = violations.find(
      (v) => v.rule === "symbol-coverage",
    );

    // We should have must-priority-coverage violation
    expect(mustPriorityViolation).toBeDefined();
    // We should have symbol-coverage violation (same symbol, different rule)
    expect(symbolCoverageViolation).toBeDefined();
    expect(symbolCoverageViolation?.entityId).toBe("symbol-all-001");
    // We should also have symbol-traceability violation
    expect(symbolTraceabilityViolation).toBeDefined();
    expect(symbolTraceabilityViolation?.entityId).toBe("symbol-all-001");
  }, 15000);

  test("should respect disabled rules from .kb/config.json", async () => {
    await fs.mkdir(path.join(testKbPath, ".kb"), { recursive: true });
    await fs.writeFile(
      path.join(testKbPath, ".kb", "config.json"),
      JSON.stringify(
        {
          checks: {
            rules: {
              "symbol-traceability": false,
            },
          },
        },
        null,
        2,
      ),
    );

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-config-disabled-001",
      properties: {
        title: "Config disabled symbol",
        status: "active",
        source: "test://config-disabled",
      },
    });

    const result = await handleKbCheck(prolog, { workspaceRoot: testKbPath });
    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "symbol-traceability" &&
        v.entityId === "symbol-config-disabled-001",
    );

    expect(violation).toBeUndefined();
  }, 15000);

  test("should respect requireAdr from .kb/config.json", async () => {
    await fs.mkdir(path.join(testKbPath, ".kb"), { recursive: true });
    await fs.writeFile(
      path.join(testKbPath, ".kb", "config.json"),
      JSON.stringify(
        {
          checks: {
            symbolTraceability: {
              requireAdr: true,
            },
          },
        },
        null,
        2,
      ),
    );

    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-config-adr-001",
      properties: {
        title: "ADR config requirement",
        status: "open",
        source: "test://config-adr",
      },
    });

    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-config-adr-001",
      properties: {
        title: "ADR constrained symbol",
        status: "active",
        source: "test://config-adr",
      },
      relationships: [
        {
          type: "implements",
          from: "symbol-config-adr-001",
          to: "req-config-adr-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-traceability"],
      workspaceRoot: testKbPath,
    });

    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "symbol-traceability" &&
        v.entityId === "symbol-config-adr-001",
    );

    expect(violation).toBeDefined();
    expect(violation?.description).toMatch(/ADR/i);
  }, 15000);

  test("should pass well-formed strict facts with strict-fact-shape rule", async () => {
    // Create a well-formed subject fact
    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-WELLFORMED-MCP-001",
      properties: {
        title: "Well-formed Subject Fact",
        status: "active",
        source: "test://strict-fact-shape",
        fact_kind: "subject",
        subject_key: "user.profile",
      },
    });

    const result = await handleKbCheck(prolog, {
      rules: ["strict-fact-shape"],
    });

    expect(result.structuredContent).toBeDefined();
    const violation = result.structuredContent?.violations.find(
      (v) => v.entityId === "FACT-WELLFORMED-MCP-001",
    );
    expect(violation).toBeUndefined();
  }, 15000);

  test("should not flag legacy facts without fact_kind with strict-fact-shape rule", async () => {
    // Create a legacy fact without fact_kind (should not be flagged)
    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-LEGACY-MCP-001",
      properties: {
        title: "Legacy Prose Fact",
        status: "active",
        source: "test://strict-fact-shape",
        // No fact_kind - legacy prose fact
      },
    });

    const result = await handleKbCheck(prolog, {
      rules: ["strict-fact-shape"],
    });

    expect(result.structuredContent).toBeDefined();
    const violation = result.structuredContent?.violations.find(
      (v) => v.entityId === "FACT-LEGACY-MCP-001",
    );
    expect(violation).toBeUndefined();
  }, 15000);

  test("should allow explicit strict-fact-shape opt-in even when disabled by config", async () => {
    await fs.mkdir(path.join(testKbPath, ".kb"), { recursive: true });
    await fs.writeFile(
      path.join(testKbPath, ".kb", "config.json"),
      JSON.stringify(
        {
          checks: {
            rules: {
              "strict-fact-shape": false,
            },
          },
        },
        null,
        2,
      ),
    );

    try {
      await prolog.query("kb_detach");
      await fs.writeFile(
        path.join(testKbPath, "strict-fact-optin.pl"),
        "entity(fact, 'FACT-CHECK-STRICT-001', 'Malformed strict fact', [id='FACT-CHECK-STRICT-001', title='Malformed strict fact', status=active, source='test://strict-fact-check', fact_kind=subject]).\n",
      );
      const attachResult = await prolog.query(`kb_attach('${testKbPath}')`);
      expect(attachResult.success).toBe(true);

      const result = await handleKbCheck(prolog, {
        rules: ["strict-fact-shape"],
        workspaceRoot: testKbPath,
      });

      const violation = result.structuredContent?.violations.find(
        (v) =>
          v.rule === "strict-fact-shape" &&
          v.entityId === "FACT-CHECK-STRICT-001",
      );

      expect(violation).toBeDefined();
    } finally {
      await prolog.query("kb_detach");
      const reattachResult = await prolog.query(`kb_attach('${testKbPath}')`);
      expect(reattachResult.success).toBe(true);
    }
  }, 15000);

  test("should pass fully paired strict requirements with strict-req-fact-pairing rule", async () => {
    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-PAIR-SUBJECT-MCP-001",
      properties: {
        title: "Paired Subject Fact",
        status: "active",
        source: "test://strict-req-fact-pairing",
        fact_kind: "subject",
        subject_key: "user.session",
      },
    });

    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-PAIR-PROP-MCP-001",
      properties: {
        title: "Paired Property Fact",
        status: "active",
        source: "test://strict-req-fact-pairing",
        fact_kind: "property_value",
        subject_key: "user.session",
        property_key: "max_age_minutes",
        operator: "eq",
        value_type: "int",
        value_int: 30,
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-PAIR-PASS-MCP-001",
      properties: {
        title: "Paired strict requirement",
        status: "open",
        source: "test://strict-req-fact-pairing",
      },
      relationships: [
        {
          type: "constrains",
          from: "REQ-PAIR-PASS-MCP-001",
          to: "FACT-PAIR-SUBJECT-MCP-001",
        },
        {
          type: "requires_property",
          from: "REQ-PAIR-PASS-MCP-001",
          to: "FACT-PAIR-PROP-MCP-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["strict-req-fact-pairing"],
    });

    const violation = result.structuredContent?.violations.find(
      (v) => v.entityId === "REQ-PAIR-PASS-MCP-001",
    );
    expect(violation).toBeUndefined();
  }, 15000);

  test("should flag strict subjects without matching requires_property facts", async () => {
    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-PAIR-SUBJECT-MCP-002",
      properties: {
        title: "Missing Property Subject Fact",
        status: "active",
        source: "test://strict-req-fact-pairing",
        fact_kind: "subject",
        subject_key: "account.session",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-PAIR-MISSING-PROP-MCP-001",
      properties: {
        title: "Missing paired property requirement",
        status: "open",
        source: "test://strict-req-fact-pairing",
      },
      relationships: [
        {
          type: "constrains",
          from: "REQ-PAIR-MISSING-PROP-MCP-001",
          to: "FACT-PAIR-SUBJECT-MCP-002",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["strict-req-fact-pairing"],
    });

    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "strict-req-fact-pairing" &&
        v.entityId === "REQ-PAIR-MISSING-PROP-MCP-001",
    );

    expect(violation).toBeDefined();
    expect(violation?.description).toMatch(/requires_property/i);
  }, 15000);

  test("should flag requirements relying on legacy facts for strict pairing", async () => {
    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-PAIR-SUBJECT-MCP-003",
      properties: {
        title: "Legacy Pairing Subject",
        status: "active",
        source: "test://strict-req-fact-pairing",
        fact_kind: "subject",
        subject_key: "billing.account",
      },
    });

    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-PAIR-LEGACY-MCP-001",
      properties: {
        title: "Legacy Prose Pairing Fact",
        status: "active",
        source: "test://strict-req-fact-pairing",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-PAIR-LEGACY-MCP-001",
      properties: {
        title: "Legacy strict pairing attempt",
        status: "open",
        source: "test://strict-req-fact-pairing",
      },
      relationships: [
        {
          type: "constrains",
          from: "REQ-PAIR-LEGACY-MCP-001",
          to: "FACT-PAIR-SUBJECT-MCP-003",
        },
        {
          type: "requires_property",
          from: "REQ-PAIR-LEGACY-MCP-001",
          to: "FACT-PAIR-LEGACY-MCP-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["strict-req-fact-pairing"],
    });

    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "strict-req-fact-pairing" &&
        v.entityId === "REQ-PAIR-LEGACY-MCP-001",
    );

    expect(violation).toBeDefined();
    expect(violation?.description).toMatch(/legacy|property_value|strict/i);
  }, 15000);

  test("should allow explicit strict-req-fact-pairing opt-in even when disabled by config", async () => {
    await fs.mkdir(path.join(testKbPath, ".kb"), { recursive: true });
    await fs.writeFile(
      path.join(testKbPath, ".kb", "config.json"),
      JSON.stringify(
        {
          checks: {
            rules: {
              "strict-req-fact-pairing": false,
            },
          },
        },
        null,
        2,
      ),
    );

    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-PAIR-SUBJECT-MCP-004",
      properties: {
        title: "Opt-in Subject Fact",
        status: "active",
        source: "test://strict-req-fact-pairing",
        fact_kind: "subject",
        subject_key: "org.member",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-PAIR-OPTIN-MCP-001",
      properties: {
        title: "Opt-in pairing requirement",
        status: "open",
        source: "test://strict-req-fact-pairing",
      },
      relationships: [
        {
          type: "constrains",
          from: "REQ-PAIR-OPTIN-MCP-001",
          to: "FACT-PAIR-SUBJECT-MCP-004",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["strict-req-fact-pairing"],
      workspaceRoot: testKbPath,
    });

    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "strict-req-fact-pairing" &&
        v.entityId === "REQ-PAIR-OPTIN-MCP-001",
    );

    expect(violation).toBeDefined();
  }, 15000);

  test("should flag requires_predicate edges pointing to observation facts", async () => {
    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-PREDICATE-OBS-MCP-001",
      properties: {
        title: "Observation used as predicate",
        status: "active",
        source: "test://predicate-verifiability",
        fact_kind: "observation",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-PREDICATE-VERIFY-MCP-001",
      properties: {
        title: "Predicate verification requirement",
        status: "open",
        source: "test://predicate-verifiability",
      },
      relationships: [
        {
          type: "requires_predicate",
          from: "REQ-PREDICATE-VERIFY-MCP-001",
          to: "FACT-PREDICATE-OBS-MCP-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["predicate-verifiability"],
    });

    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "predicate-verifiability" &&
        v.entityId === "REQ-PREDICATE-VERIFY-MCP-001",
    );

    expect(violation).toBeDefined();
    expect(violation?.description).toContain("requires_predicate");
    expect(violation?.description).toContain("fact_kind=observation");
    expect(violation?.suggestion).toContain("fact_kind: predicate");
  }, 15000);

  test("should pass requires_predicate edges pointing to predicate facts", async () => {
    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-PREDICATE-GROUND-MCP-001",
      properties: {
        title: "Ground predicate fact",
        status: "active",
        source: "test://predicate-verifiability",
        fact_kind: "predicate",
        predicate_name: "commit_action",
        predicate_args: ["editor.annotation", "navigation", "draft"],
        canonical_key: "commit_action(editor.annotation,navigation,draft)",
        polarity: "assert",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-PREDICATE-VERIFY-MCP-002",
      properties: {
        title: "Predicate verification requirement",
        status: "open",
        source: "test://predicate-verifiability",
      },
      relationships: [
        {
          type: "requires_predicate",
          from: "REQ-PREDICATE-VERIFY-MCP-002",
          to: "FACT-PREDICATE-GROUND-MCP-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["predicate-verifiability"],
    });

    const violation = result.structuredContent?.violations.find(
      (v) => v.entityId === "REQ-PREDICATE-VERIFY-MCP-002",
    );

    expect(violation).toBeUndefined();
  }, 15000);

  test("should report domain-contradictions when a closed requirement is still current", async () => {
    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-DOMAIN-CLOSED-SUBJECT-001",
      properties: {
        title: "Closed domain contradiction subject",
        status: "active",
        source: "test://domain-contradictions",
        fact_kind: "subject",
        subject_key: "session.closed",
      },
    });

    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-DOMAIN-CLOSED-PROP-001",
      properties: {
        title: "Timeout 30 minutes",
        status: "active",
        source: "test://domain-contradictions",
        fact_kind: "property_value",
        subject_key: "session.closed",
        property_key: "timeout_minutes",
        operator: "eq",
        value_type: "int",
        value_int: 30,
        closed_world: true,
        canonical_key: "session.closed.timeout_minutes.eq.30",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-DOMAIN-CLOSED-001",
      properties: {
        title: "Closed requirement stays current",
        status: "closed",
        source: "test://domain-contradictions",
      },
      relationships: [
        {
          type: "constrains",
          from: "REQ-DOMAIN-CLOSED-001",
          to: "FACT-DOMAIN-CLOSED-SUBJECT-001",
        },
        {
          type: "requires_property",
          from: "REQ-DOMAIN-CLOSED-001",
          to: "FACT-DOMAIN-CLOSED-PROP-001",
        },
      ],
    });

    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-DOMAIN-CLOSED-PROP-002",
      properties: {
        title: "Timeout 60 minutes",
        status: "active",
        source: "test://domain-contradictions",
        fact_kind: "property_value",
        subject_key: "session.closed",
        property_key: "timeout_minutes",
        operator: "eq",
        value_type: "int",
        value_int: 60,
        closed_world: false,
        canonical_key: "session.closed.timeout_minutes.eq.60",
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-DOMAIN-OPEN-001",
      properties: {
        title: "Open conflicting requirement",
        status: "open",
        source: "test://domain-contradictions",
      },
      relationships: [
        {
          type: "constrains",
          from: "REQ-DOMAIN-OPEN-001",
          to: "FACT-DOMAIN-CLOSED-SUBJECT-001",
        },
        {
          type: "requires_property",
          from: "REQ-DOMAIN-OPEN-001",
          to: "FACT-DOMAIN-CLOSED-PROP-002",
        },
      ],
      _skipContradictionCheck: true,
    });

    const result = await handleKbCheck(prolog, {
      rules: ["domain-contradictions"],
    });

    const violation = result.structuredContent?.violations.find(
      (v) =>
        v.rule === "domain-contradictions" &&
        v.entityId.includes("REQ-DOMAIN-CLOSED-001") &&
        v.entityId.includes("REQ-DOMAIN-OPEN-001"),
    );

    expect(violation).toBeDefined();
    expect(violation?.description).toContain("timeout_minutes");
  }, 15000);

  test("should ignore same-subject requirements that constrain different properties", async () => {
    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-DOMAIN-DIFF-SUBJECT-001",
      properties: {
        title: "Shared subject",
        status: "active",
        source: "test://domain-contradictions",
        fact_kind: "subject",
        subject_key: "session.config",
      },
    });

    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-DOMAIN-DIFF-PROP-001",
      properties: {
        title: "Timeout 30 minutes",
        status: "active",
        source: "test://domain-contradictions",
        fact_kind: "property_value",
        subject_key: "session.config",
        property_key: "timeout_minutes",
        operator: "eq",
        value_type: "int",
        value_int: 30,
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-DOMAIN-DIFF-PROP-001",
      properties: {
        title: "Timeout requirement",
        status: "open",
        source: "test://domain-contradictions",
      },
      relationships: [
        {
          type: "constrains",
          from: "REQ-DOMAIN-DIFF-PROP-001",
          to: "FACT-DOMAIN-DIFF-SUBJECT-001",
        },
        {
          type: "requires_property",
          from: "REQ-DOMAIN-DIFF-PROP-001",
          to: "FACT-DOMAIN-DIFF-PROP-001",
        },
      ],
    });

    await handleKbUpsert(prolog, {
      type: "fact",
      id: "FACT-DOMAIN-DIFF-PROP-002",
      properties: {
        title: "Max retries 5",
        status: "active",
        source: "test://domain-contradictions",
        fact_kind: "property_value",
        subject_key: "session.config",
        property_key: "max_retries",
        operator: "eq",
        value_type: "int",
        value_int: 5,
      },
    });

    await handleKbUpsert(prolog, {
      type: "req",
      id: "REQ-DOMAIN-DIFF-PROP-002",
      properties: {
        title: "Retry requirement",
        status: "open",
        source: "test://domain-contradictions",
      },
      relationships: [
        {
          type: "constrains",
          from: "REQ-DOMAIN-DIFF-PROP-002",
          to: "FACT-DOMAIN-DIFF-SUBJECT-001",
        },
        {
          type: "requires_property",
          from: "REQ-DOMAIN-DIFF-PROP-002",
          to: "FACT-DOMAIN-DIFF-PROP-002",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["domain-contradictions"],
    });

    expect(result.structuredContent?.count).toBe(0);
    expect(result.structuredContent?.violations).toEqual([]);
  }, 15000);

  test("should pass symbol-coverage through scenario verified_by chain", async () => {
    // Canonical split semantics: symbol --implements--> req --specified_by--> scenario --verified_by--> test
    // The symbol has covered_by → test, test validates → scenario, scenario specified_by req
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-scen-chain-001",
      properties: {
        title: "Chain coverage requirement",
        status: "open",
        source: "test://chain-coverage",
      },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-chain-001",
      properties: {
        title: "Chain coverage scenario",
        status: "active",
        source: "test://chain-coverage",
      },
    });
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-chain-001",
      properties: {
        title: "Chain coverage test",
        status: "passing",
        source: "test://chain-coverage",
      },
    });

    // Link req → scenario (specified_by)
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-scen-chain-001",
      properties: {
        title: "Chain coverage requirement",
        status: "open",
        source: "test://chain-coverage",
      },
      relationships: [
        {
          type: "specified_by",
          from: "req-scen-chain-001",
          to: "scenario-chain-001",
        },
      ],
    });

    // Link scenario → test (verified_by)
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-chain-001",
      properties: {
        title: "Chain coverage scenario",
        status: "active",
        source: "test://chain-coverage",
      },
      relationships: [
        {
          type: "verified_by",
          from: "scenario-chain-001",
          to: "test-chain-001",
        },
      ],
    });

    // Symbol implements req and covered_by test
    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-chain-001",
      properties: {
        title: "Chain coverage symbol",
        status: "active",
        source: "test://chain-coverage",
      },
      relationships: [
        {
          type: "implements",
          from: "symbol-chain-001",
          to: "req-scen-chain-001",
        },
        { type: "covered_by", from: "symbol-chain-001", to: "test-chain-001" },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-coverage"],
    });

    const violation = result.structuredContent?.violations.find(
      (v) => v.entityId === "symbol-chain-001",
    );
    // Should pass because scenario → test → req chain is complete
    expect(violation).toBeUndefined();
  }, 15000);

  test("should reject mixed executable_for and implements semantics", async () => {
    // Split semantics are exclusive: executable_for marks test identity, while
    // implements marks production ownership. A symbol may not carry both.
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-exec-trace-001",
      properties: {
        title: "Executable trace requirement",
        status: "open",
        source: "test://exec-trace",
      },
    });
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-exec-trace-001",
      properties: {
        title: "Executable trace test",
        status: "passing",
        source: "test://exec-trace",
      },
    });
    await expect(
      handleKbUpsert(prolog, {
        type: "symbol",
        id: "symbol-exec-trace-001",
        properties: {
          title: "Executable trace symbol",
          status: "active",
          source: "test://exec-trace",
        },
        relationships: [
          {
            type: "implements",
            from: "symbol-exec-trace-001",
            to: "req-exec-trace-001",
          },
          {
            type: "executable_for",
            from: "symbol-exec-trace-001",
            to: "test-exec-trace-001",
          },
        ],
      }),
    ).rejects.toThrow(/cannot mix executable_for/i);
  }, 15000);

  test("should pass symbol-coverage when test validates scenario that is specified by requirement", async () => {
    // Split semantics: test → scenario (validates), scenario ← requirement (specified_by)
    // Symbol has covered_by → test, and the test validates a scenario linked to the requirement
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-validates-chain-001",
      properties: {
        title: "Validates chain requirement",
        status: "open",
        source: "test://validates-chain",
      },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-validates-001",
      properties: {
        title: "Validates chain scenario",
        status: "active",
        source: "test://validates-chain",
      },
    });
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-validates-001",
      properties: {
        title: "Validates chain test",
        status: "passing",
        source: "test://validates-chain",
      },
    });

    // req → scenario (specified_by)
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-validates-chain-001",
      properties: {
        title: "Validates chain requirement",
        status: "open",
        source: "test://validates-chain",
      },
      relationships: [
        {
          type: "specified_by",
          from: "req-validates-chain-001",
          to: "scenario-validates-001",
        },
      ],
    });

    // test → scenario (validates) — the scenario↔test edge
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-validates-001",
      properties: {
        title: "Validates chain test",
        status: "passing",
        source: "test://validates-chain",
      },
      relationships: [
        {
          type: "validates",
          from: "test-validates-001",
          to: "scenario-validates-001",
        },
      ],
    });

    // Symbol: implements req, covered_by test
    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-validates-001",
      properties: {
        title: "Validates chain symbol",
        status: "active",
        source: "test://validates-chain",
      },
      relationships: [
        {
          type: "implements",
          from: "symbol-validates-001",
          to: "req-validates-chain-001",
        },
        {
          type: "covered_by",
          from: "symbol-validates-001",
          to: "test-validates-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, {
      rules: ["symbol-coverage"],
    });

    const violation = result.structuredContent?.violations.find(
      (v) => v.entityId === "symbol-validates-001",
    );
    // Should pass: covered_by test → validates scenario ← specified_by req (with implements)
    expect(violation).toBeUndefined();
  }, 15000);

  // --- TDD regression tests: symbol-coverage misconception & diagnostic detail ---
  // Tests A & D assert diagnostic detail that Task 2 will implement — they may FAIL
  // on the suggestion/description assertions until then. Semantic assertions should PASS.

  test("fails symbol-coverage when direct verified_by exists but req has scenario (direct req→test blocked)", async () => {
    // Misconception: agent adds verified_by(req,test) thinking it helps, but direct
    // req→test path is blocked when a scenario exists via specified_by.
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-direct-blocked-001",
      properties: {
        title: "Req with scenario",
        status: "open",
        source: "test://coverage-direct-blocked",
      },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-direct-blocked-001",
      properties: {
        title: "Blocking scenario",
        status: "active",
        source: "test://coverage-direct-blocked",
      },
    });
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-direct-blocked-001",
      properties: {
        title: "Blocked test",
        status: "passing",
        source: "test://coverage-direct-blocked",
      },
    });

    // Link req → scenario (specified_by) AND add direct verified_by(req→test)
    // Both in ONE upsert: each re-upsert retracts all prior entity triples, so
    // specified_by would be lost if we made separate calls. The agent wrongly
    // thinks verified_by(req,test) fixes coverage, but it's blocked by the scenario.
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-direct-blocked-001",
      properties: {
        title: "Req with scenario",
        status: "open",
        source: "test://coverage-direct-blocked",
      },
      relationships: [
        {
          type: "specified_by",
          from: "req-direct-blocked-001",
          to: "scenario-direct-blocked-001",
        },
        {
          type: "verified_by",
          from: "req-direct-blocked-001",
          to: "test-direct-blocked-001",
        },
      ],
    });

    // Symbol: implements req, covered_by test
    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-direct-blocked-001",
      properties: {
        title: "Blocked symbol",
        status: "active",
        source: "test://coverage-direct-blocked",
      },
      relationships: [
        {
          type: "implements",
          from: "symbol-direct-blocked-001",
          to: "req-direct-blocked-001",
        },
        {
          type: "covered_by",
          from: "symbol-direct-blocked-001",
          to: "test-direct-blocked-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, { rules: ["symbol-coverage"] });
    const violation = result.structuredContent?.violations.find(
      (v: Violation) => v.entityId === "symbol-direct-blocked-001",
    );
    // CORRECT semantic: violation exists because direct req→test is blocked
    expect(violation).toBeDefined();
    expect(violation?.description).toMatch(/qualifying requirement coverage/i);
    // FAILS until Task 2: suggestion should mention scenario path
    expect(violation?.suggestion).toMatch(
      /scenario|specified_by|scenario_path/i,
    );
  }, 15000);

  test("passes symbol-coverage with verified_by from scenario to test (scenario path)", async () => {
    // Correct path: verified_by(scenario→test) satisfies scenario chain
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-scenario-vb-001",
      properties: {
        title: "Scenario VB requirement",
        status: "open",
        source: "test://scenario-vb",
      },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-scenario-vb-001",
      properties: {
        title: "Scenario VB scenario",
        status: "active",
        source: "test://scenario-vb",
      },
    });
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-scenario-vb-001",
      properties: {
        title: "Scenario VB test",
        status: "passing",
        source: "test://scenario-vb",
      },
    });

    // req → scenario (specified_by)
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-scenario-vb-001",
      properties: {
        title: "Scenario VB requirement",
        status: "open",
        source: "test://scenario-vb",
      },
      relationships: [
        {
          type: "specified_by",
          from: "req-scenario-vb-001",
          to: "scenario-scenario-vb-001",
        },
      ],
    });

    // scenario → test (verified_by)
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-scenario-vb-001",
      properties: {
        title: "Scenario VB scenario",
        status: "active",
        source: "test://scenario-vb",
      },
      relationships: [
        {
          type: "verified_by",
          from: "scenario-scenario-vb-001",
          to: "test-scenario-vb-001",
        },
      ],
    });

    // Symbol: implements req, covered_by test
    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-scenario-vb-001",
      properties: {
        title: "Scenario VB symbol",
        status: "active",
        source: "test://scenario-vb",
      },
      relationships: [
        {
          type: "implements",
          from: "symbol-scenario-vb-001",
          to: "req-scenario-vb-001",
        },
        {
          type: "covered_by",
          from: "symbol-scenario-vb-001",
          to: "test-scenario-vb-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, { rules: ["symbol-coverage"] });
    const violation = result.structuredContent?.violations.find(
      (v: Violation) => v.entityId === "symbol-scenario-vb-001",
    );
    // Coverage satisfied through scenario path
    expect(violation).toBeUndefined();
  }, 15000);

  test("passes symbol-coverage with validates from test to scenario (scenario path)", async () => {
    // Correct path: validates(test→scenario) satisfies scenario chain
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-scenario-val-001",
      properties: {
        title: "Scenario validates requirement",
        status: "open",
        source: "test://scenario-val",
      },
    });
    await handleKbUpsert(prolog, {
      type: "scenario",
      id: "scenario-scenario-val-001",
      properties: {
        title: "Scenario validates scenario",
        status: "active",
        source: "test://scenario-val",
      },
    });
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-scenario-val-001",
      properties: {
        title: "Scenario validates test",
        status: "passing",
        source: "test://scenario-val",
      },
    });

    // req → scenario (specified_by)
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-scenario-val-001",
      properties: {
        title: "Scenario validates requirement",
        status: "open",
        source: "test://scenario-val",
      },
      relationships: [
        {
          type: "specified_by",
          from: "req-scenario-val-001",
          to: "scenario-scenario-val-001",
        },
      ],
    });

    // test → scenario (validates)
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-scenario-val-001",
      properties: {
        title: "Scenario validates test",
        status: "passing",
        source: "test://scenario-val",
      },
      relationships: [
        {
          type: "validates",
          from: "test-scenario-val-001",
          to: "scenario-scenario-val-001",
        },
      ],
    });

    // Symbol: implements req, covered_by test
    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-scenario-val-001",
      properties: {
        title: "Scenario validates symbol",
        status: "active",
        source: "test://scenario-val",
      },
      relationships: [
        {
          type: "implements",
          from: "symbol-scenario-val-001",
          to: "req-scenario-val-001",
        },
        {
          type: "covered_by",
          from: "symbol-scenario-val-001",
          to: "test-scenario-val-001",
        },
      ],
    });

    const result = await handleKbCheck(prolog, { rules: ["symbol-coverage"] });
    const violation = result.structuredContent?.violations.find(
      (v: Violation) => v.entityId === "symbol-scenario-val-001",
    );
    // Coverage satisfied through scenario validates path
    expect(violation).toBeUndefined();
  }, 15000);

  test("fails symbol-coverage when symbol has no covered_by (diagnostic mentions covered_by)", async () => {
    // Symbol implements req but lacks covered_by — should fail
    await handleKbUpsert(prolog, {
      type: "req",
      id: "req-no-cb-001",
      properties: {
        title: "No covered_by requirement",
        status: "open",
        source: "test://no-cb",
      },
    });
    await handleKbUpsert(prolog, {
      type: "test",
      id: "test-no-cb-001",
      properties: {
        title: "No covered_by test",
        status: "passing",
        source: "test://no-cb",
      },
      relationships: [
        { type: "validates", from: "test-no-cb-001", to: "req-no-cb-001" },
      ],
    });
    // Symbol with implements but NO covered_by
    await handleKbUpsert(prolog, {
      type: "symbol",
      id: "symbol-no-cb-001",
      properties: {
        title: "No covered_by symbol",
        status: "active",
        source: "test://no-cb",
      },
      relationships: [
        { type: "implements", from: "symbol-no-cb-001", to: "req-no-cb-001" },
      ],
    });

    const result = await handleKbCheck(prolog, { rules: ["symbol-coverage"] });
    const violation = result.structuredContent?.violations.find(
      (v: Violation) => v.entityId === "symbol-no-cb-001",
    );
    expect(violation).toBeDefined();
    // FAILS until Task 2: suggestion should mention covered_by
    expect(violation?.suggestion).toContain("covered_by");
  }, 15000);
});
describe("kb_check resolveCorePlPath integration", () => {
  const savedEnv: Record<string, string | undefined> = {};

  afterEach(() => {
    // Restore env overrides
    for (const key of ["KIBI_CHECKS_PL_PATH", "KIBI_KB_PL_PATH"]) {
      if (!Object.hasOwn(savedEnv, key)) {
        // This key was never snapshotted for this test; leave process.env as-is.
        continue;
      }
      const savedValue = savedEnv[key];
      if (savedValue === undefined) {
        Reflect.deleteProperty(process.env, key);
      } else {
        process.env[key] = savedValue;
      }
      Reflect.deleteProperty(savedEnv, key);
    }
  });

  afterAll(() => {
    Reflect.deleteProperty(process.env, "KIBI_CHECKS_PL_PATH");
    Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
  });

  test("KIBI_CHECKS_PL_PATH explicit override is used by resolveCorePlPath", () => {
    // Arrange: create a temp file as the explicit override
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-check-override-"));
    try {
      const overridePath = path.join(tmpDir, "checks.pl");
      writeFileSync(overridePath, "% override checks\n");

      savedEnv.KIBI_CHECKS_PL_PATH = process.env.KIBI_CHECKS_PL_PATH;
      process.env.KIBI_CHECKS_PL_PATH = overridePath;

      // Import resolveCorePlPath to verify it returns the override
      const result = resolveCorePlPath("checks.pl");

      expect(result).toBe(overridePath);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("KIBI_KB_PL_PATH alone causes checks.pl sibling derivation", () => {
    // Arrange: create an isolated core copy with kb.pl and checks.pl siblings
    const coreDir = mkdtempSync(path.join(os.tmpdir(), "kibi-check-sibling-"));
    try {
      mkdirSync(path.join(coreDir, "src"), { recursive: true });
      const kbPath = path.join(coreDir, "src", "kb.pl");
      const checksPath = path.join(coreDir, "src", "checks.pl");
      writeFileSync(kbPath, "% kb\n");
      writeFileSync(checksPath, "% checks sibling\n");

      savedEnv.KIBI_KB_PL_PATH = process.env.KIBI_KB_PL_PATH;
      process.env.KIBI_KB_PL_PATH = kbPath;
      // Ensure no CHECKS override overrides our test
      savedEnv.KIBI_CHECKS_PL_PATH = process.env.KIBI_CHECKS_PL_PATH;
      Reflect.deleteProperty(process.env, "KIBI_CHECKS_PL_PATH");

      const result = resolveCorePlPath("checks.pl");

      expect(result).toBe(checksPath);
    } finally {
      rmSync(coreDir, { recursive: true, force: true });
    }
  });
});
