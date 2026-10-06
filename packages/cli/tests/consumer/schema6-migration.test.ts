// implements REQ-kibi-schema6-migration
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  adviseProse,
  createConsumerWorkspace,
  doc,
  quotaValueFact,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of the schema 5 -> 6 upgrade. The workspace starts as a
 * schema 5 KB: the manifest `kibi init` writes, at schemaVersion 5, and
 * entity documents without `origin`, one of whose clause ledgers was written
 * by an older semantic advisor. The upgrade is planned, approved by hash and
 * applied through the built CLI.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type Action = Json & {
  id: string;
  code: string;
  safety: string;
  evidence: Json;
};
type Origin = { kind: string; ref?: string; recorded_at?: string };
type Entity = Json & { id: string; origin?: Origin };

const MIGRATION_REF = "kibi migrate v5->v6";
const ORIGIN_BLOCK =
  /origin:\n {2}kind: migration\n {2}ref: kibi migrate v5->v6\n {2}recorded_at: '[^']+'\n/;
const SCHEMA6_CODES = new Set([
  "entity_origin_backfill",
  "semantic_inventory_rederive",
  "semantic_inventory_review",
  "schema_version_upgrade",
  "migration_sync",
]);

const REQ_PATH = ".kb/requirements/REQ-QUOTA-CALL.md";
const TEST_PATH = ".kb/tests/TEST-QUOTA-CALL.md";

function planActions(ws: ConsumerWorkspace) {
  const plan = ws.json(["migrate", "--dry-run", "--format", "json"]);
  return {
    plan,
    actions: new Map(
      (plan.actions as Action[]).map((action) => [action.id, action]),
    ),
  };
}

/** stdout carries only the JSON result; the steps' progress goes to stderr. */
function applyApprovedPlan(ws: ConsumerWorkspace, planHash: string): Json {
  return ws.json([
    "migrate",
    "--apply-safe",
    "--approved-plan-hash",
    planHash,
    "--format",
    "json",
  ]);
}

function entities(ws: ConsumerWorkspace, type: string): Entity[] {
  const result = ws.json(["query"], { type });
  return (result.data as Json).entities as Entity[];
}

describe("schema 6 migration through the kibi CLI", () => {
  test("a schema 5 KB migrates to schema 6 with migration origins and its grounding intact, and a rerun finds nothing to do", () => {
    const ws = createConsumerWorkspace("kibi-schema6-migration-");
    workspace = ws;

    // kibi init starts at schema 6; a KB written before it says 5.
    const manifest = JSON.parse(ws.read(".kb/manifest.json")) as Json;
    expect(manifest.schemaVersion).toBe(LATEST_KB_SCHEMA_VERSION);
    ws.write(
      ".kb/manifest.json",
      `${JSON.stringify({ ...manifest, schemaVersion: 5 }, null, 2)}\n`,
    );

    const prose =
      "The remaining call quota must be greater than 0. Every quota reset must be reviewed by an operator.";
    const { contract, propositions } = adviseProse(ws, prose);
    const [numeric, review] = propositions as [
      (typeof propositions)[number],
      (typeof propositions)[number],
    ];
    expect([numeric.role, review.role]).toEqual(["normative", "normative"]);
    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    ws.write(
      ".kb/facts/FACT-QUOTA-POSITIVE.md",
      quotaValueFact(
        "FACT-QUOTA-POSITIVE",
        "Remaining quota above zero",
        "gt",
        0,
        { key: numeric.claim_key, text: numeric.claim_text },
      ),
    );
    // The older advisor read the review clause as rationale, so the stored
    // ledger leaves it out of logic_claims; the quota clause is grounded.
    const olderLedger = semanticFrontMatter(prose, contract, [
      { ...numeric, status: "modeled" },
      { ...review, role: "rationale", status: "nonlogical" },
    ]).replace(/^logic_claims: .*$/m, `logic_claims: [${numeric.claim_key}]`);
    ws.write(
      REQ_PATH,
      doc(
        `
id: REQ-QUOTA-CALL
title: Calls need remaining quota and resets need review
type: req
status: open
priority: must
${olderLedger}
links:
  - type: constrains
    target: FACT-QUOTA-SUBJECT
  - type: requires_property
    target: FACT-QUOTA-POSITIVE
  - type: specified_by
    target: SCEN-QUOTA-CALL
  - type: verified_by
    target: TEST-QUOTA-CALL
`,
        prose,
      ),
    );
    ws.write(
      ".kb/scenarios/SCEN-QUOTA-CALL.md",
      doc(
        `
id: SCEN-QUOTA-CALL
title: A client with remaining call quota can call
type: scenario
status: active
links:
  - type: verified_by
    target: TEST-QUOTA-CALL
`,
        "Given remaining quota, when the client calls, the call succeeds.",
      ),
    );
    ws.write(
      TEST_PATH,
      doc(
        `
id: TEST-QUOTA-CALL
title: Client call quota test
type: test
status: passing
`,
        "Checks the client call quota.",
      ),
    );
    // An exception nobody approved exempts nothing; the upgrade asks a
    // person to decide.
    const exceptionProse = "Promo calls may skip the call quota.";
    const exception = adviseProse(ws, exceptionProse);
    ws.write(
      ".kb/requirements/REQ-QUOTA-PROMO-EXCEPTION.md",
      doc(
        `
id: REQ-QUOTA-PROMO-EXCEPTION
title: Promo calls are exempt from the quota
type: req
status: open
priority: should
${semanticFrontMatter(exceptionProse, exception.contract, exception.propositions)}
links:
  - type: exempts
    target: REQ-QUOTA-CALL
`,
        exceptionProse,
      ),
    );
    ws.stage();
    const requirementBefore = ws.read(REQ_PATH);
    const testBefore = ws.read(TEST_PATH);

    // The dry run plans the origin backfill, the re-derivation of the
    // drifted ledger and the exception review, and writes nothing.
    const { plan, actions } = planActions(ws);
    expect(actions.get("entity-origin-backfill")).toMatchObject({
      code: "entity_origin_backfill",
      safety: "automatic",
      autoApplicable: true,
      evidence: {
        count: 6,
        byType: { req: 2, scenario: 1, test: 1, fact: 2 },
      },
    });
    expect(
      (
        actions.get("entity-origin-backfill")?.evidence.entityIds as string[]
      ).sort(),
    ).toEqual([
      "FACT-QUOTA-POSITIVE",
      "FACT-QUOTA-SUBJECT",
      "REQ-QUOTA-CALL",
      "REQ-QUOTA-PROMO-EXCEPTION",
      "SCEN-QUOTA-CALL",
      "TEST-QUOTA-CALL",
    ]);
    expect(
      actions.get("semantic-inventory-rederive-REQ-QUOTA-CALL"),
    ).toMatchObject({
      code: "semantic_inventory_rederive",
      safety: "automatic",
      autoApplicable: true,
      evidence: {
        summary: { keptModeled: 1, newlyUnresolved: 1, downgradedModeled: 0 },
        changes: [
          {
            claim_key: review.claim_key,
            change: "now_unresolved",
            before: { role: "rationale", status: "nonlogical" },
            after: { role: "normative", status: review.status },
          },
        ],
      },
    });
    expect(
      actions.get("review-exception-unapproved-REQ-QUOTA-PROMO-EXCEPTION"),
    ).toMatchObject({ safety: "review", dispositionRequired: true });
    expect(actions.get("schema-config-upgrade")?.dependsOn).toEqual(
      expect.arrayContaining([
        "entity-origin-backfill",
        "semantic-inventory-rederive-REQ-QUOTA-CALL",
      ]),
    );
    expect(ws.read(REQ_PATH)).toBe(requirementBefore);

    // Applying the plan approved by its hash upgrades the manifest and
    // recompiles the KB.
    const applied = applyApprovedPlan(ws, String(plan.planHash));
    const outcome = applied.structuredContent as Json;
    expect(outcome.outcome).toBe("applied");
    expect(
      (outcome.actionResults as Array<{ actionId: string; outcome: string }>)
        .filter((result) =>
          [
            "entity-origin-backfill",
            "semantic-inventory-rederive-REQ-QUOTA-CALL",
            "schema-config-upgrade",
            "migration-sync",
          ].includes(result.actionId),
        )
        .map((result) => result.outcome),
    ).toEqual(["applied", "applied", "applied", "applied"]);
    expect(JSON.parse(ws.read(".kb/manifest.json")).schemaVersion).toBe(
      LATEST_KB_SCHEMA_VERSION,
    );
    const status = ws.json(["status", "--format", "json"]);
    expect(status.syncState).toBe("fresh");
    expect(status.schemaStatus).toMatchObject({
      status: "current",
      currentVersion: LATEST_KB_SCHEMA_VERSION,
    });

    // Every entity now says the migration recorded it.
    const migrated = ["req", "scenario", "test", "fact"].flatMap((type) =>
      entities(ws, type),
    );
    expect(migrated.map((entity) => entity.id).sort()).toEqual([
      "FACT-QUOTA-POSITIVE",
      "FACT-QUOTA-SUBJECT",
      "REQ-QUOTA-CALL",
      "REQ-QUOTA-PROMO-EXCEPTION",
      "SCEN-QUOTA-CALL",
      "TEST-QUOTA-CALL",
    ]);
    for (const entity of migrated)
      expect(entity.origin).toEqual({
        kind: "migration",
        ref: MIGRATION_REF,
        recorded_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
    // The origin is the last frontmatter key; every other byte is kept, apart
    // from the schema 8 tag that acknowledges the test's missing body context.
    const testAfter = ws.read(TEST_PATH);
    expect(testAfter).toMatch(new RegExp(`\\n${ORIGIN_BLOCK.source}---\\n`));
    expect(
      testAfter
        .replace(ORIGIN_BLOCK, "")
        .replace("tags:\n  - review:context-missing\n", ""),
    ).toBe(testBefore);

    // The grounded clause stays modeled and keeps its fact; the reclassified
    // clause is unresolved, never modeled.
    const call = entities(ws, "req").find(
      (entity) => entity.id === "REQ-QUOTA-CALL",
    );
    const ledger = call?.semantic_inventory as Array<{
      claim_key: string;
      role: string;
      status: string;
    }>;
    expect(
      ledger.map((entry) => [entry.claim_key, entry.role, entry.status]),
    ).toEqual([
      [numeric.claim_key, "normative", "modeled"],
      [review.claim_key, "normative", review.status],
    ]);
    expect(review.status).not.toBe("modeled");
    expect(call?.logic_claims).toEqual([numeric.claim_key, review.claim_key]);
    expect(call?.requires_property).toBe("kb:entity/FACT-QUOTA-POSITIVE");

    // The migrated KB checks clean.
    const check = ws.json(["check", "--format", "json"]);
    expect((check.structuredContent as Json).violations).toEqual([]);

    // A rerun has nothing left to migrate.
    const rerun = planActions(ws);
    expect(
      [...rerun.actions.values()]
        .filter((action) => SCHEMA6_CODES.has(action.code))
        .map((action) => action.id),
    ).toEqual([]);
    expect(ws.text(["migrate", "--yes"])).toContain("No migration needed");
    expect(ws.read(TEST_PATH)).toBe(testAfter);
  }, 300_000);
});
