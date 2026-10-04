// implements REQ-kibi-fresh-verification-receipts-v2
import { afterEach, describe, expect, test } from "bun:test";
import {
  type CliRun,
  type ConsumerWorkspace,
  type CoverageRow,
  type Json,
  coverageRows,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Consumer view of proof receipt histories: every receipt is produced by
 * `kibi prove` against a small command integration in the fixture. Ingest
 * keeps only the receipts that still decide proof, `kibi proof compact`
 * shortens a long history by the same policy, and a per-test report lets a
 * failing step fail only the test that owns it.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const PAY = "TEST-checkout-pay";
const REFUND = "TEST-checkout-refund";
const PAY_DOC = `.kb/tests/${PAY}.md`;
const INTEGRATION = "checkout-proof";
const PLAN_ENV = "CHECKOUT_PROOF_PLAN";

type Receipt = Json & {
  receipt_id: string;
  test_id: string;
  outcome: string;
  code_snapshot: string;
  finished_at: string;
};

type ProveResult = {
  testId: string;
  outcome: string;
  receiptId: string;
  applied: boolean;
  duplicate: boolean;
  receiptCount: number;
  compacted: number;
};

type ProveSummary = {
  proved: number;
  failed: number;
  unchanged: number;
  runs: Array<{
    integration: string;
    attribution?: string;
    attributionReason?: string;
    failedSteps?: Json[];
    results: ProveResult[];
  }>;
  failures?: string[];
};

/** How the fixture's proof command behaves for one `kibi prove` run. */
type Plan = Readonly<{
  failing?: readonly string[];
  report?: "complete" | "none" | "malformed" | "omit-refund";
}>;

/**
 * The project's proof command. Each selected test runs a setup step and its
 * own check step; the command writes a kibi.proof-test-report.v1 naming
 * every step and exits non-zero when any check failed.
 */
const PROOF_COMMAND = `import { writeFileSync } from "node:fs";
const plan = JSON.parse(process.env.${PLAN_ENV} ?? "{}");
const failing = new Set(plan.failing ?? []);
const selected = JSON.parse(process.env.KIBI_PROOF_TEST_IDS ?? "[]");
const self = ["node", "scripts/checkout-proof.mjs"];
const tests = selected.map((testId) => {
  const failed = failing.has(testId);
  return {
    test_id: testId,
    outcome: failed ? "failed" : "passed",
    steps: [
      { step_index: 1, command: [...self, "setup", testId], outcome: "passed", exit_code: 0 },
      { step_index: 2, command: [...self, "check", testId], outcome: failed ? "failed" : "passed", exit_code: failed ? 3 : 0 },
    ],
  };
});
const report = plan.report ?? "complete";
const reportPath = process.env.KIBI_PROOF_TEST_REPORT;
if (reportPath && report === "malformed") writeFileSync(reportPath, "{ not json");
if (reportPath && (report === "complete" || report === "omit-refund")) {
  const reported = report === "omit-refund"
    ? tests.filter((entry) => entry.test_id !== "${REFUND}")
    : tests;
  writeFileSync(reportPath, JSON.stringify({ version: "kibi.proof-test-report.v1", tests: reported }));
}
process.exit(tests.some((entry) => entry.outcome !== "passed") ? 1 : 0);
`;

function proofTest(id: string, title: string): string {
  return doc(
    `
id: ${id}
title: ${title}
type: test
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: ${INTEGRATION}
  required_proofs:
    - symbol_id: SYM-${id.slice("TEST-".length)}
      target: default
  success_policy: all_required_first_attempt
links:
  - type: validates
    target: SCEN-checkout-pay
`,
    `${title}.`,
  );
}

function seed(ws: ConsumerWorkspace): void {
  ws.write(
    ".kb/requirements/REQ-checkout-pay.md",
    doc(
      `
id: REQ-checkout-pay
title: Shoppers pay for their checkout
type: req
status: open
links:
  - type: specified_by
    target: SCEN-checkout-pay
`,
      "Shoppers pay for their checkout.",
    ),
  );
  ws.write(
    ".kb/scenarios/SCEN-checkout-pay.md",
    doc(
      `
id: SCEN-checkout-pay
title: A shopper pays for a checkout and can be refunded
type: scenario
status: active
`,
      "Given a cart, when the shopper pays, the card is charged and a refund returns the money.",
    ),
  );
  ws.write(PAY_DOC, proofTest(PAY, "Paying a checkout charges the card"));
  ws.write(
    `.kb/tests/${REFUND}.md`,
    proofTest(REFUND, "Refunding a checkout returns the money"),
  );
  ws.write(
    ".kb/proof/integrations.json",
    `${JSON.stringify(
      {
        version: "kibi.proof-integration.v1",
        integrations: [
          {
            id: INTEGRATION,
            producer: "command",
            command: ["node", "scripts/checkout-proof.mjs"],
            targets: ["default"],
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  ws.write("scripts/checkout-proof.mjs", PROOF_COMMAND);
  ws.git("add", "-A");
  ws.git("commit", "-q", "-m", "checkout proof fixture");
  ws.sync();
}

/** Run `kibi prove` with the given plan; the summary is its last line. */
function prove(
  ws: ConsumerWorkspace,
  selector: readonly string[],
  plan: Plan,
  expectedExit: number,
): ProveSummary {
  const run: CliRun = ws.kibi(["prove", ...selector], {
    env: { [PLAN_ENV]: JSON.stringify(plan) },
  });
  expect({ status: run.status, stderr: run.stderr }).toMatchObject({
    status: expectedExit,
  });
  const lines = run.stdout.trim().split("\n");
  return JSON.parse(lines.at(-1) ?? "{}") as ProveSummary;
}

function receipts(ws: ConsumerWorkspace, testId: string): Receipt[] {
  const data = ws.json(["query"], { type: "test", id: testId }).data as {
    entities: Array<{ proof_receipts?: Receipt[] }>;
  };
  expect(data.entities).toHaveLength(1);
  return data.entities[0]?.proof_receipts ?? [];
}

/** The authored document with its proof_receipts frontmatter block removed. */
function withoutReceipts(content: string): string {
  const lines = content.split("\n");
  const start = lines.findIndex((line) => /^proof_receipts\s*:/.test(line));
  if (start === -1) return content;
  let end = start + 1;
  while (
    end < lines.length &&
    !/^[A-Za-z_][A-Za-z0-9_-]*\s*:/.test(lines[end] ?? "") &&
    lines[end] !== "---"
  ) {
    end++;
  }
  return [...lines.slice(0, start), ...lines.slice(end)].join("\n");
}

function proofSnapshot(ws: ConsumerWorkspace): string {
  const status = ws.kibi(["status", "--format", "json"]);
  expect(status.status).toBe(0);
  const snapshot = (JSON.parse(status.stdout) as { proofSnapshot?: string })
    .proofSnapshot;
  expect(snapshot).toMatch(/^[0-9a-f]{64}$/);
  return snapshot as string;
}

/** The requirement's coverage row without its wall-clock age fields. */
function payRow(ws: ConsumerWorkspace): CoverageRow | undefined {
  const row = coverageRows(ws).get("REQ-checkout-pay");
  return row === undefined
    ? undefined
    : (JSON.parse(
        JSON.stringify(row, (key, value) =>
          key === "checkedAt" || key === "ageSeconds" ? undefined : value,
        ),
      ) as CoverageRow);
}

describe("proof receipt compaction through the kibi CLI", () => {
  test("ingest keeps only the newest and deciding receipts of every kibi prove run", () => {
    const ws = createConsumerWorkspace("kibi-receipt-ingest-");
    workspace = ws;
    seed(ws);
    const authored = ws.read(PAY_DOC);
    const snapshot = proofSnapshot(ws);

    // pass, pass, fail, fail, pass on one snapshot and binding.
    const runs: Array<[Plan, number, number, number]> = [
      [{}, 0, 1, 0],
      [{}, 0, 1, 1],
      [{ failing: [PAY] }, 1, 2, 0],
      [{ failing: [PAY] }, 1, 2, 1],
      [{}, 0, 1, 2],
    ];
    const produced: ProveResult[] = [];
    const histories: string[][] = [];
    for (const [plan, exit, receiptCount, compacted] of runs) {
      const summary = prove(ws, ["--test", PAY], plan, exit);
      const outcome = exit === 0 ? "passed" : "failed";
      expect(summary).toMatchObject({
        proved: exit === 0 ? 1 : 0,
        failed: exit === 0 ? 0 : 1,
        unchanged: 0,
      });
      expect(summary.runs).toHaveLength(1);
      expect(summary.runs[0]?.integration).toBe(INTEGRATION);
      const [result] = summary.runs[0]?.results ?? [];
      expect(result).toMatchObject({
        testId: PAY,
        outcome,
        applied: true,
        duplicate: false,
        receiptCount,
        compacted,
      });
      produced.push(result as ProveResult);
      const history = receipts(ws, PAY);
      expect(history).toHaveLength(receiptCount);
      // The run's own receipt is always the newest entry.
      expect(history.at(-1)).toMatchObject({
        receipt_id: result?.receiptId,
        test_id: PAY,
        outcome,
        code_snapshot: snapshot,
      });
      histories.push(history.map((receipt) => receipt.receipt_id));
    }
    const ids = produced.map((result) => result.receiptId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(histories).toEqual([
      [ids[0]],
      // A newer pass supersedes the older pass.
      [ids[1]],
      // A failure keeps the last passing receipt beside it.
      [ids[1], ids[2]],
      // A second failure supersedes the first; the last pass stays.
      [ids[1], ids[3]],
      // A pass is both newest and newest passing: nothing else decides.
      [ids[4]],
    ]);

    // Only the receipts block of the authored document was rewritten, so
    // the proof snapshot never moved.
    expect(withoutReceipts(ws.read(PAY_DOC))).toBe(authored);
    expect(proofSnapshot(ws)).toBe(snapshot);
    expect(receipts(ws, REFUND)).toEqual([]);

    // A history ingest already compacted has nothing left to drop.
    const compact = ws.kibi(["proof", "compact", "--json"]);
    expect(compact.status).toBe(0);
    expect(JSON.parse(compact.stdout)).toMatchObject({
      policy: "kibi.proof-receipt-compaction.v1",
      snapshot,
      dryRun: false,
      removed: 0,
      tests: [],
      skipped: [],
    });
  }, 300_000);

  test("a failing step fails only the test that owns it, and an unattributable failure fails every selected test", () => {
    const ws = createConsumerWorkspace("kibi-receipt-attribution-");
    workspace = ws;
    seed(ws);
    // No selector: every proof-bearing test runs in one integration process.
    const everyTest: string[] = [];

    // A complete per-test report: the refund check fails, the pay test's
    // own steps all passed.
    const split = prove(ws, everyTest, { failing: [REFUND] }, 1);
    expect(split).toMatchObject({ proved: 1, failed: 1, unchanged: 0 });
    expect(split.failures).toBeUndefined();
    expect(split.runs).toHaveLength(1);
    expect(split.runs[0]).toMatchObject({
      integration: INTEGRATION,
      attribution: "per_test",
      failedSteps: [
        {
          testId: REFUND,
          stepIndex: 2,
          command: ["node", "scripts/checkout-proof.mjs", "check", REFUND],
          outcome: "failed",
          exitCode: 3,
        },
      ],
    });
    expect(split.runs[0]?.attributionReason).toBeUndefined();
    const outcomes = (summary: ProveSummary) =>
      Object.fromEntries(
        (summary.runs[0]?.results ?? []).map((result) => [
          result.testId,
          result.outcome,
        ]),
      );
    expect(outcomes(split)).toEqual({ [PAY]: "passed", [REFUND]: "failed" });
    expect(receipts(ws, PAY).at(-1)?.outcome).toBe("passed");
    expect(receipts(ws, REFUND).at(-1)?.outcome).toBe("failed");

    // The run directory keeps the whole process run for audit beside the
    // slice each test was evaluated against.
    const artifact = (suffix: string) =>
      JSON.parse(ws.read(`.kb/proof/runs/${INTEGRATION}${suffix}.json`)) as {
        run: { outcome: string; exit_code: number };
        diagnostics?: string[];
      };
    expect(artifact("").run).toMatchObject({ outcome: "failed", exit_code: 1 });
    expect(artifact(".passed").run).toMatchObject({
      outcome: "passed",
      exit_code: 0,
    });
    const failedSlice = artifact(".failed");
    expect(failedSlice.run).toMatchObject({ outcome: "failed", exit_code: 3 });
    expect(failedSlice.diagnostics).toContain(
      `${REFUND} step 2 failed (exit 3): node scripts/checkout-proof.mjs check ${REFUND}`,
    );

    // A run whose failure cannot be attributed to its owner fails closed:
    // every selected test gets a failed receipt and the summary says why.
    const unattributed: Array<[Plan, string]> = [
      [
        { failing: [REFUND], report: "none" },
        "the integration exited 1 without a kibi.proof-test-report.v1, so the failure cannot be attributed to a test",
      ],
      [
        { failing: [REFUND], report: "malformed" },
        "the kibi.proof-test-report.v1 is not valid JSON",
      ],
      [
        { failing: [REFUND], report: "omit-refund" },
        `the kibi.proof-test-report.v1 was rejected (report omits selected test(s): ${REFUND}), so the run is evaluated as one unit`,
      ],
    ];
    for (const [plan, reason] of unattributed) {
      const summary = prove(ws, everyTest, plan, 1);
      expect(summary).toMatchObject({ proved: 0, failed: 2 });
      expect(summary.runs[0]?.attribution).toBe("aggregate");
      expect(summary.runs[0]?.attributionReason).toContain(reason);
      expect(outcomes(summary)).toEqual({
        [PAY]: "failed",
        [REFUND]: "failed",
      });
      expect(receipts(ws, PAY).at(-1)?.outcome).toBe("failed");
      expect(receipts(ws, REFUND).at(-1)?.outcome).toBe("failed");
    }

    // A fully passing run is one unit again and proves both tests.
    const green = prove(ws, everyTest, {}, 0);
    expect(green).toMatchObject({ proved: 2, failed: 0 });
    expect(green.runs[0]).toMatchObject({
      attribution: "aggregate",
      attributionReason: "the integration passed",
    });
    expect(green.runs[0]?.failedSteps).toBeUndefined();
    expect(receipts(ws, PAY).at(-1)?.outcome).toBe("passed");
    expect(receipts(ws, REFUND).at(-1)?.outcome).toBe("passed");
  }, 300_000);

  test("kibi proof compact shortens a long history to its newest and deciding receipts without changing coverage", () => {
    const ws = createConsumerWorkspace("kibi-receipt-compact-");
    workspace = ws;
    seed(ws);
    const authored = ws.read(PAY_DOC);

    // Four engine-derived receipts on one snapshot: pass, pass, pass, fail.
    const carried: Receipt[] = [];
    for (const plan of [{}, {}, {}, { failing: [PAY] }] as Plan[]) {
      prove(ws, ["--test", PAY], plan, plan.failing ? 1 : 0);
      carried.push(receipts(ws, PAY).at(-1) as Receipt);
    }
    expect(carried.map((receipt) => receipt.outcome)).toEqual([
      "passed",
      "passed",
      "passed",
      "failed",
    ]);

    // A store from before ingest-time compaction holds all four. Restore
    // the authored document, rebuild the KB from it, and append the
    // receipts, verbatim, through the append-only upsert route.
    ws.git("checkout", "--", PAY_DOC);
    expect(ws.read(PAY_DOC)).toBe(authored);
    const rebuild = ws.kibi(["sync", "--rebuild"]);
    expect(rebuild.status).toBe(0);
    expect(receipts(ws, PAY)).toEqual([]);
    const authoredEntity = (
      ws.json(["query"], { type: "test", id: PAY }).data as {
        entities: Json[];
      }
    ).entities[0] as Json;
    const upsert = ws.json(["upsert"], {
      type: "test",
      id: PAY,
      properties: {
        title: authoredEntity.title,
        status: authoredEntity.status,
        verification_scope: authoredEntity.verification_scope,
        verification_perspective: authoredEntity.verification_perspective,
        proof_contract: authoredEntity.proof_contract,
        proof_receipts: carried,
      },
    });
    expect(upsert.status).toBe("success");
    expect(receipts(ws, PAY)).toEqual(carried);
    const longDoc = ws.read(PAY_DOC);
    expect(withoutReceipts(longDoc)).toBe(authored);
    const rowBefore = payRow(ws);
    expect(rowBefore).toBeDefined();

    // A dry run reports the policy's cut and writes nothing.
    const dryRun = ws.kibi(["proof", "compact", "--dry-run", "--json"]);
    expect(dryRun.status).toBe(0);
    expect(JSON.parse(dryRun.stdout)).toMatchObject({
      policy: "kibi.proof-receipt-compaction.v1",
      dryRun: true,
      removed: 2,
      tests: [{ testId: PAY, before: 4, after: 2, removed: 2 }],
      skipped: [],
    });
    expect(ws.read(PAY_DOC)).toBe(longDoc);
    expect(receipts(ws, PAY)).toEqual(carried);

    // The real run keeps the last passing receipt and the newest receipt,
    // which is also the one coverage decides from.
    const compact = ws.kibi(["proof", "compact"]);
    expect(compact.status).toBe(0);
    expect(compact.stdout).toContain(
      "Proof receipts compacted (kibi.proof-receipt-compaction.v1). Removed 2 superseded receipt(s) across 1 test(s).",
    );
    expect(compact.stdout).toContain(`${PAY}: 4 -> 2 receipt(s)`);
    const kept = [carried[2], carried[3]] as Receipt[];
    expect(receipts(ws, PAY)).toEqual(kept);
    const shortDoc = ws.read(PAY_DOC);
    expect(withoutReceipts(shortDoc)).toBe(authored);
    for (const receipt of carried) {
      expect(shortDoc.includes(receipt.receipt_id)).toBe(
        kept.includes(receipt),
      );
    }
    expect(payRow(ws)).toEqual(rowBefore);

    // The policy is idempotent, and the shorter history is what the
    // authored document now holds: a rebuild from it reads the same two.
    const again = ws.kibi(["proof", "compact"]);
    expect(again.status).toBe(0);
    expect(again.stdout).toContain("No test had superseded receipts.");
    expect(ws.kibi(["sync", "--rebuild"]).status).toBe(0);
    expect(receipts(ws, PAY)).toEqual(kept);
  }, 300_000);
});
