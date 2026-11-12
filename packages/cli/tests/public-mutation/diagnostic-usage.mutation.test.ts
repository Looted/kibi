import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import packageJson from "../../package.json";
import {
  appendCliDiagnosticUsage,
  deriveDiagnosticUsageFields,
  diagnosticCliHost,
  diagnosticEnvOptIn,
  diagnosticMutationFingerprint,
  nearestPackageVersion,
} from "../../src/public/diagnostic-usage.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const envelope = (data: unknown, extra: Record<string, unknown> = {}) => ({
  kibiProtocol: 1,
  resultVersion: "kibi.x.v1",
  status: "success",
  effects: [],
  data,
  ...extra,
});

describe("diagnosticMutationFingerprint", () => {
  test("hashes sorted args without the telemetry key", () => {
    expect(
      diagnosticMutationFingerprint({
        b: [{ d: 1, c: 2 }],
        a: "x",
        _diagnostic_telemetry: { s: 1 },
      }),
    ).toBe(sha('{"a":"x","b":[{"c":2,"d":1}]}'));
  });
});

describe("deriveDiagnosticUsageFields", () => {
  test("records missing telemetry and a default summary", () => {
    expect(
      deriveDiagnosticUsageFields("kb_status", {}, null, undefined),
    ).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_status completed",
    });
  });

  test("copies telemetry fields and envelope status", () => {
    expect(
      deriveDiagnosticUsageFields(
        "kb_status",
        {},
        {
          session_id: "s",
          actor_id: "a",
          followed_next_actions: ["n"],
          unsafe_original_retry: true,
          is_autonomous: false,
          confidence_score: 0,
          attempt_number: 2,
        },
        {
          structuredContent: envelope(
            {},
            {
              effects: [
                { status: "failed", kind: "k" },
                { status: "completed" },
                "x",
              ],
            },
          ),
        },
      ),
    ).toStrictEqual({
      telemetry_status: "provided",
      telemetry_is_autonomous: false,
      telemetry_confidence_score: 0,
      telemetry_attempt_number: 2,
      session_id: "s",
      actor_id: "a",
      protocol_version: 1,
      result_version: "kibi.x.v1",
      result_status: "success",
      effect_failures: [{ status: "failed", kind: "k" }],
      followed_next_actions: ["n"],
      unsafe_original_retry: true,
      result_summary: "kb_status completed",
    });
    expect(
      deriveDiagnosticUsageFields(
        "kb_status",
        {},
        {
          session_id: 1,
          actor_id: null,
          followed_next_actions: "n",
          unsafe_original_retry: "yes",
        },
        envelope({}, { resultVersion: 2, status: 3, effects: "none" }),
      ),
    ).toStrictEqual({
      telemetry_status: "provided",
      telemetry_is_autonomous: null,
      telemetry_confidence_score: null,
      telemetry_attempt_number: null,
      protocol_version: 1,
      result_version: null,
      result_status: null,
      effect_failures: [],
      followed_next_actions: [],
      unsafe_original_retry: false,
      result_summary: "kb_status completed",
    });
    expect(
      deriveDiagnosticUsageFields("kb_status", {}, null, envelope({})),
    ).toMatchObject({
      followed_next_actions: [],
      unsafe_original_retry: false,
    });
  });

  test("counts query, search and check results", () => {
    for (const tool of ["kb_query", "kb_search"]) {
      expect(
        deriveDiagnosticUsageFields(tool, {}, null, { count: 0 }),
      ).toStrictEqual({
        telemetry_status: "missing",
        result_count: 0,
        result_summary: "0 results",
        zero_results: true,
      });
      expect(
        deriveDiagnosticUsageFields(tool, {}, null, { count: 2 }),
      ).toMatchObject({
        result_count: 2,
        zero_results: false,
      });
      expect(deriveDiagnosticUsageFields(tool, {}, null, {})).toStrictEqual({
        telemetry_status: "missing",
        result_count: null,
        result_summary: "results count unavailable",
      });
    }
    expect(
      deriveDiagnosticUsageFields("kb_check", { rules: ["a"] }, null, {
        count: 3,
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      violation_count: 3,
      result_summary: "3 violations",
      requested_rules: ["a"],
    });
    expect(
      deriveDiagnosticUsageFields("kb_check", { rules: "a" }, null, {}),
    ).toMatchObject({ requested_rules: [] });
  });

  test("names drifted fingerprint components in receipt gap details", () => {
    const fields = deriveDiagnosticUsageFields(
      "kb_coverage",
      { by: "req" },
      null,
      envelope({
        rows: [
          {
            id: "REQ-d",
            proofGaps: ["stale_proof_receipt"],
            proofStages: {
              passingE2e: {
                staleReceiptTests: ["T2", "T1"],
                receiptEvidence: [
                  { testId: "T2", fingerprintDrift: ["command"] },
                  { testId: "T1", fingerprintDrift: ["integration", 4, "command"] },
                  { testId: "T3", fingerprintDrift: [] },
                  { fingerprintDrift: ["command"] },
                  "not a row",
                ],
              },
            },
          },
          {
            id: "REQ-e",
            proofGaps: ["stale_proof_receipt"],
            proofStages: { passingE2e: { receiptEvidence: "none" } },
          },
        ],
      }),
    );
    expect(fields.coverage_receipt_gaps).toStrictEqual([
      {
        requirementId: "REQ-d",
        testIds: ["T1", "T2"],
        codes: ["stale_proof_receipt"],
        fingerprintDrift: [
          { testId: "T1", components: ["integration", "command"] },
          { testId: "T2", components: ["command"] },
        ],
      },
      { requirementId: "REQ-e", testIds: [], codes: ["stale_proof_receipt"] },
    ]);
  });

  test("summarizes coverage receipt gaps", () => {
    const row = (id: unknown, gaps: unknown, passingE2e?: unknown) => ({
      id,
      proofGaps: gaps,
      ...(passingE2e === undefined ? {} : { proofStages: { passingE2e } }),
    });
    const fields = deriveDiagnosticUsageFields(
      "kb_coverage",
      { by: "scenario" },
      null,
      envelope({
        rows: [
          row(
            "REQ-b",
            [
              "stale_proof_receipt",
              "missing_proof_receipt",
              "failed_proof_receipt",
              "invalid_proof_receipt",
              "proof_contract_mismatch",
              "proof_snapshot_unavailable",
              "missing_proof_receipt",
              "other",
            ],
            {
              missingReceiptTests: ["T2", "T1"],
              staleReceiptTests: ["T3"],
              failedReceiptTests: ["T4"],
              invalidReceiptTests: ["T5"],
              contractMismatchReceiptTests: ["T6"],
              snapshotUnavailableTests: ["T7", 8, "T1"],
            },
          ),
          row(7, ["stale_proof_receipt"], "not a record"),
          row("REQ-c", ["other", 5]),
          row("REQ-a", "none"),
          "not a row",
        ],
        summary: { total: 9, proofTested: 4, proofMissing: 2 },
        repairPlan: { scope: { complete: false } },
      }),
    );
    expect(fields).toStrictEqual({
      telemetry_status: "missing",
      protocol_version: 1,
      result_version: "kibi.x.v1",
      result_status: "success",
      effect_failures: [],
      followed_next_actions: [],
      unsafe_original_retry: false,
      coverage_by: "scenario",
      coverage_requirement_count: 9,
      coverage_tested_count: 4,
      coverage_proof_missing_count: 2,
      coverage_proof_gap_count: 10,
      coverage_gap_codes: [
        "failed_proof_receipt",
        "invalid_proof_receipt",
        "missing_proof_receipt",
        "other",
        "proof_contract_mismatch",
        "proof_snapshot_unavailable",
        "stale_proof_receipt",
      ],
      coverage_receipt_gap_count: 8,
      coverage_receipt_gaps: [
        {
          requirementId: "REQ-b",
          testIds: ["T1", "T2", "T3", "T4", "T5", "T6", "T7"],
          codes: [
            "failed_proof_receipt",
            "invalid_proof_receipt",
            "missing_proof_receipt",
            "proof_contract_mismatch",
            "proof_snapshot_unavailable",
            "stale_proof_receipt",
          ],
        },
        {
          requirementId: "unknown",
          testIds: [],
          codes: ["stale_proof_receipt"],
        },
      ],
      coverage_receipt_gap_total: 2,
      coverage_receipt_gaps_truncated: false,
      coverage_scope_complete: false,
      result_summary: "4 tested; 10 proof gaps",
    });
  });

  test("defaults coverage counts and caps receipt gaps at fifty", () => {
    const rows = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `REQ-${String(index).padStart(2, "0")}`,
        proofGaps: ["missing_proof_receipt"],
      }));
    const fifty = deriveDiagnosticUsageFields("kb_coverage", {}, null, {
      rows: rows(50),
    });
    expect([
      fifty.coverage_by,
      fifty.coverage_requirement_count,
      fifty.coverage_tested_count,
      fifty.coverage_proof_missing_count,
      (fifty.coverage_receipt_gaps as unknown[]).length,
      fifty.coverage_receipt_gap_total,
      fifty.coverage_receipt_gaps_truncated,
      "coverage_scope_complete" in fifty,
    ]).toStrictEqual(["req", 50, 0, 0, 50, 50, false, false]);
    const more = deriveDiagnosticUsageFields("kb_coverage", {}, null, {
      rows: rows(51).reverse(),
      summary: "x",
      repairPlan: { scope: "x" },
    });
    expect([
      (more.coverage_receipt_gaps as { requirementId: string }[]).length,
      (more.coverage_receipt_gaps as { requirementId: string }[])[0]
        ?.requirementId,
      more.coverage_receipt_gap_total,
      more.coverage_receipt_gaps_truncated,
    ]).toStrictEqual([50, "REQ-00", 51, true]);
    expect(
      deriveDiagnosticUsageFields("kb_coverage", {}, null, {
        rows: "x",
        repairPlan: "x",
      }),
    ).toMatchObject({
      coverage_requirement_count: 0,
      coverage_receipt_gaps: [],
    });
    expect(
      deriveDiagnosticUsageFields("kb_coverage", {}, null, {
        rows: ["junk", 7, { requirementId: "REQ-1" }],
      }),
    ).toMatchObject({ coverage_requirement_count: 1 });
    expect(
      deriveDiagnosticUsageFields("kb_coverage", {}, null, undefined),
    ).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_coverage completed",
    });
  });

  test("records semantic advisor and mutation fields", () => {
    const receipt = {
      inventory_contract: { source_hash: "h" },
      logic_readiness: "ready",
      candidate_lane: "strict",
    };
    expect(
      deriveDiagnosticUsageFields("kb_semantic_advisor", {}, null, { receipt }),
    ).toStrictEqual({
      telemetry_status: "missing",
      semantic_source_hash: "h",
      semantic_logic_readiness: "ready",
      semantic_candidate_lane: "strict",
      result_summary: "kb_semantic_advisor completed",
    });
    expect(
      deriveDiagnosticUsageFields("kb_semantic_advisor", {}, null, {
        receipt: {
          inventory_contract: "x",
          logic_readiness: 1,
          candidate_lane: 2,
        },
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_semantic_advisor completed",
    });
    expect(
      deriveDiagnosticUsageFields("kb_semantic_advisor", {}, null, {
        receipt: { inventory_contract: { source_hash: 1 } },
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_semantic_advisor completed",
    });
    expect(
      deriveDiagnosticUsageFields("kb_semantic_advisor", {}, null, undefined),
    ).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_semantic_advisor completed",
    });

    const args = { type: "req", id: "REQ-1" };
    expect(
      deriveDiagnosticUsageFields("kb_validate_upsert", args, null, {
        valid: true,
        semanticAdvisor: receipt,
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      mutation_fingerprint: sha('{"id":"REQ-1","type":"req"}'),
      mutation_target: "req:REQ-1",
      validation_valid: true,
      semantic_source_hash: "h",
      semantic_logic_readiness: "ready",
      semantic_candidate_lane: "strict",
      result_summary: "kb_validate_upsert completed",
    });
    expect(
      deriveDiagnosticUsageFields(
        "kb_validate_upsert",
        { type: 1 },
        null,
        undefined,
      ),
    ).toStrictEqual({
      telemetry_status: "missing",
      mutation_fingerprint: sha('{"type":1}'),
      mutation_target: "unknown:unknown",
      validation_valid: false,
      result_summary: "kb_validate_upsert completed",
    });
    expect(
      deriveDiagnosticUsageFields("kb_upsert", args, null, {
        semanticAdvisor: receipt,
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      mutation_fingerprint: sha('{"id":"REQ-1","type":"req"}'),
      mutation_target: "req:REQ-1",
      semantic_source_hash: "h",
      semantic_logic_readiness: "ready",
      semantic_candidate_lane: "strict",
      result_summary: "kb_upsert completed",
    });
    expect(
      deriveDiagnosticUsageFields("kb_upsert", {}, null, undefined),
    ).toMatchObject({
      mutation_target: "unknown:unknown",
    });
  });
});

describe("semantic fields outside the advisor", () => {
  test("ignores a receipt on other tools", () => {
    expect(
      deriveDiagnosticUsageFields("kb_status", {}, null, {
        receipt: { logic_readiness: "ready", candidate_lane: "lane" },
      }),
    ).toStrictEqual({
      telemetry_status: "missing",
      result_summary: "kb_status completed",
    });
  });
});

describe("nearestPackageVersion", () => {
  const manifestRoot = (manifest: string | null) => {
    const root = mkdtempSync(join(tmpdir(), "kibi-pkg-"));
    roots.push(root);
    const nested = join(root, "a", "b");
    mkdirSync(nested, { recursive: true });
    if (manifest !== null) writeFileSync(join(root, "package.json"), manifest);
    return nested;
  };

  test("reads the nearest manifest version", () => {
    expect(nearestPackageVersion(manifestRoot('{"version":"1.2.3"}'))).toBe(
      "1.2.3",
    );
    expect(
      nearestPackageVersion(
        manifestRoot('{"version":"1.2.3","name":"\u00e9"}'),
      ),
    ).toBe("1.2.3");
  });

  test("returns null for a manifest without a usable version", () => {
    expect(nearestPackageVersion(manifestRoot('{"version":1}'))).toBeNull();
    expect(nearestPackageVersion(manifestRoot("{}"))).toBeNull();
    expect(nearestPackageVersion(manifestRoot('["1.2.3"]'))).toBeNull();
    expect(nearestPackageVersion(manifestRoot("null"))).toBeNull();
    expect(nearestPackageVersion(manifestRoot("{oops"))).toBeNull();
  });

  test("stops at the filesystem root", () => {
    expect(existsSync("/package.json")).toBe(false);
    expect(nearestPackageVersion("/")).toBeNull();
  });
});

describe("environment", () => {
  test("opts in through either diagnostic variable", () => {
    expect(diagnosticEnvOptIn({})).toBe(false);
    expect(diagnosticEnvOptIn({ KIBI_DIAGNOSTIC_MODE: " TRUE " })).toBe(true);
    expect(diagnosticEnvOptIn({ KIBI_DIAGNOSTIC_MODE: "1" })).toBe(true);
    expect(diagnosticEnvOptIn({ KIBI_CLI_DIAGNOSTIC_MODE: "true" })).toBe(true);
    expect(diagnosticEnvOptIn({ KIBI_CLI_DIAGNOSTIC_MODE: "yes" })).toBe(false);
    expect(diagnosticEnvOptIn({ KIBI_DIAGNOSTIC_MODE: "0" })).toBe(false);
  });

  test("names the host", () => {
    expect(diagnosticCliHost({ KIBI_HOST: " h ", KIBI_MCP_HOST: "m" })).toBe(
      "h",
    );
    expect(diagnosticCliHost({ KIBI_HOST: " ", KIBI_MCP_HOST: " m " })).toBe(
      "m",
    );
    expect(diagnosticCliHost({ CLAUDECODE: "1" })).toBe("claude-code");
    expect(diagnosticCliHost({ CLAUDECODE: "0" })).toBe("unknown");
    expect(diagnosticCliHost({})).toBe("unknown");
  });
});

const ENV_KEYS = [
  "KIBI_CLI_DIAGNOSTIC_USAGE_LOG_PATH",
  "KIBI_BRANCH",
  "KIBI_HOST",
  "KIBI_MCP_HOST",
  "CLAUDECODE",
] as const;

function withEnv(
  values: Partial<Record<(typeof ENV_KEYS)[number], string>>,
  run: () => void,
) {
  const saved = ENV_KEYS.map((key) => [key, process.env[key]] as const);
  try {
    for (const key of ENV_KEYS) Reflect.deleteProperty(process.env, key);
    Object.assign(process.env, values);
    run();
  } finally {
    for (const [key, value] of saved)
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
  }
}

describe("appendCliDiagnosticUsage", () => {
  test("appends one JSON line per call", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-usage-"));
    roots.push(root);
    const logPath = join(root, "nested", "usage.log");
    withEnv({ KIBI_BRANCH: "main", KIBI_HOST: "host" }, () => {
      appendCliDiagnosticUsage({
        workspaceRoot: root,
        tool: "kb_status",
        businessArgs: { a: 1 },
        telemetry: null,
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        finishedAt: new Date("2026-01-01T00:00:01.500Z"),
        status: "error",
        error: "boom",
        requestId: "r1",
        logPath,
      });
    });
    withEnv({}, () => {
      appendCliDiagnosticUsage({
        workspaceRoot: root,
        tool: "kb_status",
        businessArgs: {},
        telemetry: null,
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        status: "success",
        error: "",
        logPath,
      });
    });
    const lines = readFileSync(logPath, "utf8").split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe("");
    expect(JSON.parse(lines[0] as string)).toStrictEqual({
      timestamp: "2026-01-01T00:00:01.500Z",
      request_id: "r1",
      tool: "kb_status",
      interface: "cli_json",
      host: "host",
      package_version: packageJson.version,
      workspace_root: root,
      telemetry: null,
      business_args: { a: 1 },
      status: "error",
      started_at: "2026-01-01T00:00:00.000Z",
      finished_at: "2026-01-01T00:00:01.500Z",
      duration_ms: 1500,
      active_branch: "main",
      error_message: "boom",
      telemetry_status: "missing",
      result_summary: "kb_status completed",
    });
    const second = JSON.parse(lines[1] as string);
    expect(second.request_id).toMatch(/^cli-[0-9a-f-]{36}$/);
    expect("error_message" in second).toBe(false);
    expect(second.active_branch).toBeNull();
    expect(second.host).toBe("unknown");
    expect(Date.parse(second.finished_at)).toBeGreaterThan(
      Date.parse("2026-01-01T00:00:01Z"),
    );
  });

  test("writes to the configured or the workspace log", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-usage-"));
    roots.push(root);
    const input = {
      workspaceRoot: root,
      tool: "kb_status",
      businessArgs: {},
      telemetry: null,
      startedAt: new Date(0),
      status: "success" as const,
    };
    withEnv(
      { KIBI_CLI_DIAGNOSTIC_USAGE_LOG_PATH: join(root, "env", "u.log") },
      () => appendCliDiagnosticUsage(input),
    );
    withEnv({}, () => appendCliDiagnosticUsage(input));
    expect(
      readFileSync(join(root, "env", "u.log"), "utf8").split("\n"),
    ).toHaveLength(2);
    expect(
      readFileSync(join(root, ".kb", "usage.log"), "utf8").split("\n"),
    ).toHaveLength(2);
  });
});
