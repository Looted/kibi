import {
  afterAll,
  afterEach,
  beforeAll,
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
import { PrologProcess } from "kibi-cli/prolog";
import { handleKbCheck } from "../../src/tools/check.js";
import { resolveCorePlPath } from "../../src/tools/core-module.js";
import { handleKbUpsert } from "../../src/tools/upsert.js";

describe("MCP Check Tool Handler", () => {
  let prolog: PrologProcess;
  let testKbPath: string;

  beforeAll(async () => {
    testKbPath = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-mcp-check-"));

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
        status: "open",
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
  });

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
        status: "open",
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
  });

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
    expect(violation?.description).toContain("not traceable");
    expect(violation?.suggestion).toContain("symbols.yaml");
  });

  test("should pass symbol coverage when symbol implements requirement", async () => {
    // Create a symbol with an implements relationship to a requirement
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
    expect(violation).toBeUndefined();
  });

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
      /supported requirement traceability path/i,
    );
    expect(traceabilityViolation?.suggestion).toMatch(/implements/i);
    expect(traceabilityViolation?.suggestion).toMatch(/covered_by/i);
    expect(traceabilityViolation?.suggestion).toMatch(/validates|verified_by/i);
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

  test("should pass symbol-traceability when symbol is covered by validating test", async () => {
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
    expect(symbolViolation).toBeUndefined();
  }, 15000);

  test("should pass symbol-traceability when requirement is verified by covering test", async () => {
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
    expect(symbolViolation).toBeUndefined();
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
      /supported requirement traceability path/i,
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
      /supported requirement traceability path/i,
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
