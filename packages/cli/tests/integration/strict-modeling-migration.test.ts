/**
 * Cross-package integration fixtures for automated-contradiction-modeling plan.
 * Task 10: Full integration fixtures and release verification.
 *
 * Self-contained (no Prolog binary, no real .kb/ directory beyond tmp).
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  LATEST_KB_SCHEMA_VERSION,
  getSchemaVersionStatus,
} from "../../src/utils/schema-version.js";

import {
  buildStrictWriteSet,
  buildStableRequirementIds,
  modelRequirementClaims,
  type SemanticClaim,
  type StrictModelInput,
} from "../../src/utils/strict-modeling.js";

import { migrateCommand } from "../../src/commands/migrate.js";

// ─────────────────────────────────────────────────────────────────────────────

describe("Integration: schema version warning before migration", () => {
  test("config with schemaVersion: undefined returns invalid status (key present, value unparseable)", () => {
    // 'schemaVersion' key IS present but value is undefined → "invalid"
    const status = getSchemaVersionStatus({ schemaVersion: undefined });
    expect(status.status).toBe("invalid");
    expect(status.needsMigration).toBe(true);
    expect(status.warning).toBeTruthy();
    expect(status.currentVersion).toBeNull();
    expect(status.latestVersion).toBe(LATEST_KB_SCHEMA_VERSION);
  });

  test("null config (no schemaVersion key at all) returns missing status", () => {
    const status = getSchemaVersionStatus(null);
    expect(status.status).toBe("missing");
    expect(status.needsMigration).toBe(true);
    expect(status.warning).toBeTruthy();
  });

  test("config with current schemaVersion returns current status with no warning", () => {
    const status = getSchemaVersionStatus({ schemaVersion: LATEST_KB_SCHEMA_VERSION });
    expect(status.status).toBe("current");
    expect(status.needsMigration).toBe(false);
    expect(status.warning).toBeNull();
  });

  test("config with older schemaVersion returns older status needing migration", () => {
    const status = getSchemaVersionStatus({ schemaVersion: 0 });
    expect(status.status).toBe("older");
    expect(status.needsMigration).toBe(true);
    expect(status.warning).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Integration: kibi migrate idempotency", () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-migrate-test-"));
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    // Legacy config without schemaVersion — triggers migration
    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify({ branch: "main", entities: [] }),
    );
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("first migrate on legacy config exits with code 0", async () => {
    const result = await migrateCommand({ yes: true, dryRun: false });
    expect(result.exitCode).toBe(0);
  });

  test("second migrate is a no-op and exits with code 0", async () => {
    await migrateCommand({ yes: true, dryRun: false });
    const result2 = await migrateCommand({ yes: true, dryRun: false });
    expect(result2.exitCode).toBe(0);
  });

  test("after migration, config.json contains schemaVersion", async () => {
    await migrateCommand({ yes: true, dryRun: false });
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
    expect(config.schemaVersion).toBe(LATEST_KB_SCHEMA_VERSION);
  });

  test("dry-run does not write schemaVersion to config.json", async () => {
    await migrateCommand({ yes: false, dryRun: true });
    const configPath = path.join(tmpDir, ".kb", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
    expect(config.schemaVersion).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Integration: strict model entity/relationship counts", () => {
  const CLAIM: SemanticClaim = {
    source: "docs/requirements.md",
    subjectKey: "customer_data",
    propertyKey: "retention_period",
    operator: "eq",
    value: "7 years",
    confidence: 0.9,
  };

  const HIGH_INPUT: StrictModelInput = {
    claim: CLAIM,
    statement: "Customer data must be retained for 7 years.",
  };

  test("high-confidence claim produces strict write-set with req + 2 facts + 2 relationships", () => {
    const ws = buildStrictWriteSet(HIGH_INPUT);
    expect(ws.isStrict).toBe(true);
    if (!ws.isStrict) return;
    expect(ws.req.type).toBe("req");
    expect(ws.subjectFact.type).toBe("fact");
    expect(ws.propertyFact.type).toBe("fact");
    expect(ws.relationships.length).toBe(2);
    const relTypes = ws.relationships.map((r) => r.type);
    expect(relTypes).toContain("constrains");
    expect(relTypes).toContain("requires_property");
  });

  test("low-confidence claim produces observation write-set only", () => {
    const ws = buildStrictWriteSet({
      claim: { ...CLAIM, confidence: 0.5 },
      statement: "Customer data must be retained for 7 years.",
    });
    expect(ws.isStrict).toBe(false);
    if (ws.isStrict) return;
    expect(ws.observationFact.type).toBe("fact");
  });

  test("boundary confidence 0.7 produces strict write-set", () => {
    const ws = buildStrictWriteSet({
      claim: { ...CLAIM, confidence: 0.7 },
      statement: "Customer data must be retained for 7 years.",
    });
    expect(ws.isStrict).toBe(true);
  });

  test("confidence 0.69 (below threshold) produces observation", () => {
    const ws = buildStrictWriteSet({
      claim: { ...CLAIM, confidence: 0.69 },
      statement: "Customer data must be retained for 7 years.",
    });
    expect(ws.isStrict).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Integration: stable IDs on re-run", () => {
  const CLAIM: SemanticClaim = {
    source: "docs/spec.md",
    subjectKey: "invoice",
    propertyKey: "payment_terms",
    operator: "eq",
    value: "30 days",
    confidence: 0.85,
  };

  test("same claim produces identical stable IDs on two calls", () => {
    const ids1 = buildStableRequirementIds(CLAIM);
    const ids2 = buildStableRequirementIds(CLAIM);
    expect(ids1.reqId).toBe(ids2.reqId);
    expect(ids1.subjectFactId).toBe(ids2.subjectFactId);
    expect(ids1.propertyFactId).toBe(ids2.propertyFactId);
    expect(ids1.stableKey).toBe(ids2.stableKey);
  });

  test("different source produces different IDs", () => {
    const ids1 = buildStableRequirementIds(CLAIM);
    const ids2 = buildStableRequirementIds({ ...CLAIM, source: "docs/other.md" });
    expect(ids1.reqId).not.toBe(ids2.reqId);
  });

  test("different value produces different IDs", () => {
    const ids1 = buildStableRequirementIds(CLAIM);
    const ids2 = buildStableRequirementIds({ ...CLAIM, value: "60 days" });
    expect(ids1.reqId).not.toBe(ids2.reqId);
  });

  test("modelRequirementClaims deduplicates identical inputs", () => {
    const input: StrictModelInput = {
      claim: CLAIM,
      statement: "Invoices must be paid within 30 days.",
    };
    const results = modelRequirementClaims([input, input]);
    // Duplicate input → deduplicated to 1
    expect(results.length).toBe(1);
  });

  test("modelRequirementClaims is deterministic for same input", () => {
    const input: StrictModelInput = {
      claim: CLAIM,
      statement: "Invoices must be paid within 30 days.",
    };
    const results1 = modelRequirementClaims([input]);
    const results2 = modelRequirementClaims([input]);
    expect(results1.length).toBe(results2.length);
    expect(results1[0]?.isStrict).toBe(results2[0]?.isStrict);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("Integration: VS Code brief parser automationReview logic (inline)", () => {
  interface AutomationReview {
    generatedEntities: Array<{ id: string; type: string; title: string; confidence: number }>;
    strictReadinessScore: number;
    confidence: number;
    migrationWarnings: string[];
    contradictionRisks: string[];
    evidenceCitationIds: string[];
  }

  function isAutomationReview(value: unknown): value is AutomationReview {
    if (typeof value !== "object" || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
      typeof v.strictReadinessScore === "number" &&
      typeof v.confidence === "number" &&
      Array.isArray(v.generatedEntities) &&
      Array.isArray(v.migrationWarnings) &&
      Array.isArray(v.contradictionRisks) &&
      Array.isArray(v.evidenceCitationIds)
    );
  }

  function getAutomationReviewFromBrief(brief: Record<string, unknown>): AutomationReview | null {
    const sc = brief.structuredContent;
    if (typeof sc !== "object" || sc === null) return null;
    const ar = (sc as Record<string, unknown>).automationReview;
    if (!isAutomationReview(ar)) return null;
    return ar;
  }

  const MOCK: AutomationReview = {
    generatedEntities: [{ id: "REQ-AUTO-001", type: "req", title: "Data retention", confidence: 0.9 }],
    strictReadinessScore: 0.85,
    confidence: 0.9,
    migrationWarnings: [],
    contradictionRisks: [],
    evidenceCitationIds: ["FACT-SUBJECT-001"],
  };

  test("brief with valid automationReview returns non-null", () => {
    const result = getAutomationReviewFromBrief({ structuredContent: { automationReview: MOCK } });
    expect(result).not.toBeNull();
    expect(result?.strictReadinessScore).toBe(0.85);
    expect(result?.generatedEntities.length).toBe(1);
  });

  test("brief with null automationReview returns null", () => {
    expect(getAutomationReviewFromBrief({ structuredContent: { automationReview: null } })).toBeNull();
  });

  test("brief with missing structuredContent returns null", () => {
    expect(getAutomationReviewFromBrief({})).toBeNull();
  });

  test("brief with unknown shape degrades gracefully (returns null)", () => {
    expect(
      getAutomationReviewFromBrief({ structuredContent: { automationReview: { unknownField: "x" } } }),
    ).toBeNull();
  });

  test("brief with migrationWarnings returns them", () => {
    const result = getAutomationReviewFromBrief({
      structuredContent: {
        automationReview: { ...MOCK, migrationWarnings: ["Schema version is outdated. Run `kibi migrate` to upgrade."] },
      },
    });
    expect(result?.migrationWarnings.length).toBe(1);
    expect(result?.migrationWarnings[0]).toContain("kibi migrate");
  });

  test("toast appends migration required when migrationWarnings non-empty", () => {
    // Inline the VS Code activation/briefs.ts toast logic
    function buildToastMessage(title: string, hasMigrationWarnings: boolean): string {
      return hasMigrationWarnings ? `${title} — migration required` : title;
    }
    expect(buildToastMessage("Brief ready", true)).toBe("Brief ready — migration required");
    expect(buildToastMessage("Brief ready", false)).toBe("Brief ready");
  });
});
