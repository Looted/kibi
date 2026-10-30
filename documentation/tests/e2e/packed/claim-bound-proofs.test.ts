import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * E2E: a certificate proves the requirement claims its contract names, and
 * only those whose obligation Kibi derives from the claim's fact.
 *
 * SCEN-kibi-claim-bound-proofs — the semantic advisor models "Palette colors
 * must be one of red, green or blue" as a set fact. An exhaustive test whose
 * contract names that claim in proves, over a domain that is exactly the set
 * and linked covered_by the test, gets a derived binding; a test over a
 * domain missing a member and a test naming a key that is no claim of the
 * requirement get rejected bindings with the reason. kibi prove prints each
 * binding, kibi check reports the contracts that cannot prove their claims
 * and a certificate contract without proves, and kibi proof explain lists
 * the claim with its bindings. A requirement with two claims, only one of
 * them certified, is tested end to end with its failure side covered, yet
 * kibi coverage reports it tested, not proved, and names the unproved claim.
 */

type Step = Readonly<{
  type: string;
  id: string;
  properties: Record<string, unknown>;
  relationships?: readonly Record<string, string>[];
}>;

const STATEMENT = "Palette colors must be one of red, green or blue.";
const COUNT_STATEMENT = "The palette must have exactly 3 colors.";
const UNKNOWN_CLAIM = "CLAIM-0000000000000BAD";
// Two claims in one requirement; only the set claim gets a certificate.
const PAIR_STATEMENT = `${STATEMENT} ${COUNT_STATEMENT}`;

const SOURCES: Record<string, string> = {
  "colors.mjs": 'export const COLORS = ["red", "green", "blue"];\n',
  "warm.mjs": 'export const WARM = ["red", "green"];\n',
  "emit.mjs": `import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const selected = new Set(JSON.parse(process.env.KIBI_PROOF_TEST_IDS ?? "[]"));
export function emit(testId, symbolId, members) {
  const directory = process.env.KIBI_PROOF_CERTIFICATES;
  if (!directory || !selected.has(testId)) return;
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, testId + ".json"), JSON.stringify({
    version: "kibi.code-certificate.v1",
    test_id: testId,
    kind: "exhaustive",
    domain: { symbol_id: symbolId, members },
    results: members.map((member) => ({ member, outcome: "passed" })),
  }));
}
`,
  "colors-proof.mjs": `import { COLORS } from "./colors.mjs";
import { emit } from "./emit.mjs";
export function proveColors() {
  emit("TEST-COLORS-EXACT", "SYM-COLORS", COLORS);
  emit("TEST-COLORS-UNKNOWN", "SYM-COLORS", COLORS);
  emit("TEST-COLORS-UNBOUND", "SYM-COLORS", COLORS);
  emit("TEST-COLORS-PAIR", "SYM-COLORS", COLORS);
}
proveColors();
`,
  "warm-proof.mjs": `import { WARM } from "./warm.mjs";
import { emit } from "./emit.mjs";
export function proveWarm() {
  emit("TEST-COLORS-NARROW", "SYM-WARM", WARM);
}
proveWarm();
`,
  // An arithmetic certificate for the count claim; Kibi reads the count
  // from COLORS itself (value_source measure count), not from a number
  // kept beside it.
  "count-proof.mjs": `import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { COLORS } from "./colors.mjs";
export function proveCount() {
  const directory = process.env.KIBI_PROOF_CERTIFICATES;
  const selected = JSON.parse(process.env.KIBI_PROOF_TEST_IDS ?? "[]");
  if (!directory || !selected.includes("TEST-COLORS-COUNT")) return;
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "TEST-COLORS-COUNT.json"), JSON.stringify({
    version: "kibi.code-certificate.v1",
    test_id: "TEST-COLORS-COUNT",
    kind: "arithmetic",
    variable: "count",
    value_type: "int",
    assumptions: [{ operator: "eq", value: COLORS.length }],
    claim: { operator: "eq", value: 3 },
  }));
}
proveCount();
`,
  // The guard behind the failure side of the two-claim requirement: a
  // palette with any other number of colors is refused.
  "guard-proof.mjs": `export function guardCount(colors) {
  if (colors.length !== 3) throw new Error("a palette has exactly 3 colors");
  return colors;
}
for (const colors of [["red"], ["red", "green"], ["red", "green", "blue", "cyan"]]) {
  let refused = false;
  try { guardCount(colors); } catch { refused = true; }
  if (!refused) throw new Error("accepted " + colors.length + " colors");
}
`,
  "run-proofs.mjs":
    'await import("./colors-proof.mjs");\nawait import("./warm-proof.mjs");\nawait import("./count-proof.mjs");\nawait import("./guard-proof.mjs");\n',
};

async function upsert(sandbox: TestSandbox, payload: unknown): Promise<void> {
  const request = join(sandbox.repoDir, "upsert-request.json");
  writeFileSync(request, JSON.stringify(payload));
  const result = await kibi(sandbox, ["upsert", "--input", request]);
  assert.strictEqual(result.exitCode, 0, result.stdout + result.stderr);
}

/** The advisor's apply plan for a statement: subject fact, typed fact, requirement. */
async function advisorPlan(
  sandbox: TestSandbox,
  id: string,
  text: string,
  valueType: string,
): Promise<Step[]> {
  const request = join(sandbox.repoDir, "model-request.json");
  writeFileSync(
    request,
    JSON.stringify({ mode: "analyze", type: "req", id, text }),
  );
  const model = await kibi(sandbox, ["model", "--input", request]);
  assert.strictEqual(model.exitCode, 0, model.stdout + model.stderr);
  const suggestion = JSON.parse(model.stdout).data.receipt.suggestions.find(
    (row: { claim?: { value_type?: string } }) =>
      row.claim?.value_type === valueType,
  );
  assert.ok(suggestion, `no ${valueType} suggestion:\n${model.stdout}`);
  return suggestion.applyPlan as Step[];
}

/** Applies an advisor plan with the requirement specified by a scenario. */
async function applyPlan(
  sandbox: TestSandbox,
  plan: readonly Step[],
  scenario: string,
): Promise<string> {
  const requirement = plan.find((step) => step.type === "req");
  const claimKey = (
    requirement?.properties.semantic_inventory as { claim_key: string }[]
  )[0]?.claim_key;
  assert.match(claimKey ?? "", /^CLAIM-/);
  for (const step of plan)
    await upsert(sandbox, {
      type: step.type,
      id: step.id,
      properties: step.properties,
      relationships: [
        ...(step.relationships ?? []),
        ...(step.type === "req"
          ? [{ type: "specified_by", from: step.id, to: scenario }]
          : []),
      ],
    });
  return claimKey ?? "";
}

/**
 * Applies the advisor's plans for a requirement with two claims as one
 * requirement whose inventory models both claims and whose facts ground each.
 */
async function applyPairPlans(
  sandbox: TestSandbox,
  plans: readonly (readonly Step[])[],
  scenario: string,
): Promise<string[]> {
  type Claim = { claim_key: string; status: string };
  const requirements = plans.map((plan) => {
    const requirement = plan.find((step) => step.type === "req");
    assert.ok(requirement, "plan without a requirement step");
    return requirement;
  });
  const first = requirements[0] as Step;
  const inventory = (first.properties.semantic_inventory as Claim[]).map(
    (claim) =>
      requirements
        .flatMap((step) => step.properties.semantic_inventory as Claim[])
        .find(
          (row) =>
            row.claim_key === claim.claim_key && row.status === "modeled",
        ) ?? claim,
  );
  assert.ok(inventory.length === 2, JSON.stringify(inventory));
  assert.ok(
    inventory.every((claim) => claim.status === "modeled"),
    JSON.stringify(inventory),
  );
  for (const plan of plans)
    for (const step of plan.filter((row) => row.type !== "req"))
      await upsert(sandbox, step);
  await upsert(sandbox, {
    type: first.type,
    id: first.id,
    properties: { ...first.properties, semantic_inventory: inventory },
    relationships: [
      ...requirements.flatMap((step) => step.relationships ?? []),
      { type: "specified_by", from: first.id, to: scenario },
    ],
  });
  return inventory.map((claim) => claim.claim_key);
}

function testDocument(
  id: string,
  proofSymbol: string,
  domain: string,
  proves: readonly string[],
): string {
  const source =
    id === "TEST-COLORS-COUNT"
      ? `  kind: arithmetic\n  value_source:\n    - symbol_id: ${domain}\n      measure: count\n`
      : `  kind: exhaustive\n  domain_source:\n    symbol_id: ${domain}\n`;
  return `---
id: ${id}
title: Palette proof ${id}
status: passing
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: command
  required_proofs:
    - symbol_id: ${proofSymbol}
      target: default
  success_policy: all_required_first_attempt
${source}${proves.length > 0 ? `  proves:\n${proves.map((key) => `    - ${key}`).join("\n")}\n` : ""}type: test
---

Leaves a certificate for kibi prove.
`;
}

/** A test with no certificate kind: its receipt shows the guard ran. */
function guardDocument(id: string, proofSymbol: string): string {
  return `---
id: ${id}
title: Palette guard ${id}
status: passing
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: command
  required_proofs:
    - symbol_id: ${proofSymbol}
      target: default
  success_policy: all_required_first_attempt
type: test
---

Refuses a palette with the wrong number of colors.
`;
}

/**
 * The failure side of the uncertified count claim of REQ-PALETTE-PAIR: one
 * scenario per rejected count class (more and fewer than 3 colors), so the
 * requirement is tested end to end and only its claims decide proved.
 */
async function provisionPairFailureSide(sandbox: TestSandbox): Promise<void> {
  for (const [suffix, count, title] of [
    ["MANY", 4, "Refuse a palette with 4 colors"],
    ["FEW", 2, "Refuse a palette with 2 colors"],
  ] as const) {
    await upsert(sandbox, {
      type: "fact",
      id: `FACT-PALETTE-PAIR-${suffix}`,
      properties: {
        title: `The palette has ${count} colors`,
        status: "active",
        fact_kind: "property_value",
        subject_key: "colors",
        property_key: "count",
        operator: "eq",
        value_type: "int",
        value_int: count,
      },
    });
    await upsert(sandbox, {
      type: "scenario",
      id: `SCEN-PALETTE-PAIR-${suffix}`,
      properties: { title, status: "active", expects: "rejection" },
      relationships: [
        {
          type: "assumes",
          from: `SCEN-PALETTE-PAIR-${suffix}`,
          to: `FACT-PALETTE-PAIR-${suffix}`,
        },
      ],
    });
    await upsert(sandbox, {
      type: "req",
      id: "REQ-PALETTE-PAIR",
      properties: {
        title: "Palette colors must be one of red, green or blue",
        status: "open",
      },
      relationships: [
        {
          type: "specified_by",
          from: "REQ-PALETTE-PAIR",
          to: `SCEN-PALETTE-PAIR-${suffix}`,
        },
      ],
    });
  }
}

async function provision(
  sandbox: TestSandbox,
): Promise<{ claimKey: string; countKey: string; pairKeys: string[] }> {
  for (const [file, content] of Object.entries(SOURCES)) {
    writeFileSync(join(sandbox.repoDir, file), content);
    stageSourceFile(sandbox, file);
  }
  const synced = await kibi(sandbox, ["sync"]);
  assert.strictEqual(synced.exitCode, 0, synced.stdout + synced.stderr);

  for (const [id, title] of [
    ["SCEN-PALETTE", "Render the palette"],
    ["SCEN-PALETTE-COUNT", "Count the palette"],
    ["SCEN-PALETTE-PAIR", "Render and count the palette"],
  ])
    await upsert(sandbox, {
      type: "scenario",
      id,
      properties: { title, status: "active" },
    });
  const claimKey = await applyPlan(
    sandbox,
    await advisorPlan(sandbox, "REQ-PALETTE", STATEMENT, "set"),
    "SCEN-PALETTE",
  );
  const countKey = await applyPlan(
    sandbox,
    await advisorPlan(sandbox, "REQ-PALETTE-COUNT", COUNT_STATEMENT, "int"),
    "SCEN-PALETTE-COUNT",
  );
  const pairKeys = await applyPairPlans(
    sandbox,
    [
      await advisorPlan(sandbox, "REQ-PALETTE-PAIR", PAIR_STATEMENT, "set"),
      await advisorPlan(sandbox, "REQ-PALETTE-PAIR", PAIR_STATEMENT, "int"),
    ],
    "SCEN-PALETTE-PAIR",
  );
  await provisionPairFailureSide(sandbox);

  const tests: [string, string, string, string[], string][] = [
    [
      "TEST-COLORS-EXACT",
      "SYM-PROOF-COLORS",
      "SYM-COLORS",
      [claimKey],
      "SCEN-PALETTE",
    ],
    [
      "TEST-COLORS-NARROW",
      "SYM-PROOF-WARM",
      "SYM-WARM",
      [claimKey],
      "SCEN-PALETTE",
    ],
    [
      "TEST-COLORS-UNKNOWN",
      "SYM-PROOF-COLORS",
      "SYM-COLORS",
      [UNKNOWN_CLAIM],
      "SCEN-PALETTE",
    ],
    [
      "TEST-COLORS-UNBOUND",
      "SYM-PROOF-COLORS",
      "SYM-COLORS",
      [],
      "SCEN-PALETTE",
    ],
    [
      "TEST-COLORS-COUNT",
      "SYM-PROOF-COUNT",
      "SYM-COLORS",
      [countKey],
      "SCEN-PALETTE-COUNT",
    ],
    // Certifies only the set claim of the two-claim requirement.
    [
      "TEST-COLORS-PAIR",
      "SYM-PROOF-COLORS",
      "SYM-COLORS",
      [pairKeys[0] as string],
      "SCEN-PALETTE-PAIR",
    ],
  ];
  for (const [id, proofSymbol, domain, proves] of tests) {
    const relative = `.kb/tests/${id}.md`;
    writeFileSync(
      join(sandbox.repoDir, relative),
      testDocument(id, proofSymbol, domain, proves),
    );
    stageSourceFile(sandbox, relative);
  }
  const guardRelative = ".kb/tests/TEST-COLORS-PAIR-GUARD.md";
  writeFileSync(
    join(sandbox.repoDir, guardRelative),
    guardDocument("TEST-COLORS-PAIR-GUARD", "SYM-PROOF-GUARD"),
  );
  stageSourceFile(sandbox, guardRelative);
  const testsSynced = await kibi(sandbox, ["sync"]);
  assert.strictEqual(
    testsSynced.exitCode,
    0,
    testsSynced.stdout + testsSynced.stderr,
  );
  for (const [id, , , , scenario] of tests)
    await upsert(sandbox, {
      type: "test",
      id,
      properties: { title: `Palette proof ${id}`, status: "passing" },
      relationships: [{ type: "validates", from: id, to: scenario }],
    });
  await upsert(sandbox, {
    type: "test",
    id: "TEST-COLORS-PAIR-GUARD",
    properties: {
      title: "Palette guard TEST-COLORS-PAIR-GUARD",
      status: "passing",
    },
    relationships: ["MANY", "FEW"].map((suffix) => ({
      type: "validates",
      from: "TEST-COLORS-PAIR-GUARD",
      to: `SCEN-PALETTE-PAIR-${suffix}`,
    })),
  });
  const symbols: [string, string, string, string[], string[]][] = [
    [
      "SYM-COLORS",
      "COLORS",
      "colors.mjs",
      ["TEST-COLORS-EXACT", "TEST-COLORS-COUNT", "TEST-COLORS-PAIR"],
      ["REQ-PALETTE", "REQ-PALETTE-COUNT", "REQ-PALETTE-PAIR"],
    ],
    ["SYM-WARM", "WARM", "warm.mjs", ["TEST-COLORS-NARROW"], ["REQ-PALETTE"]],
    ["SYM-PROOF-COLORS", "proveColors", "colors-proof.mjs", [], []],
    ["SYM-PROOF-WARM", "proveWarm", "warm-proof.mjs", [], []],
    ["SYM-PROOF-COUNT", "proveCount", "count-proof.mjs", [], []],
    ["SYM-PROOF-GUARD", "guardCount", "guard-proof.mjs", [], []],
  ];
  const executableFor: Record<string, string[]> = {
    "SYM-PROOF-COLORS": [
      "TEST-COLORS-EXACT",
      "TEST-COLORS-UNKNOWN",
      "TEST-COLORS-UNBOUND",
      "TEST-COLORS-PAIR",
    ],
    "SYM-PROOF-WARM": ["TEST-COLORS-NARROW"],
    "SYM-PROOF-COUNT": ["TEST-COLORS-COUNT"],
    "SYM-PROOF-GUARD": ["TEST-COLORS-PAIR-GUARD"],
  };
  for (const [id, title, sourceFile, coveredBy, implementsReqs] of symbols)
    await upsert(sandbox, {
      type: "symbol",
      id,
      properties: {
        title,
        status: "active",
        sourceFile,
        symbol_role: "behavioral",
      },
      // The domains implement the requirement; the proof runners are the
      // tests' executable code.
      relationships: [
        ...implementsReqs.map((req) => ({
          type: "implements",
          from: id,
          to: req,
        })),
        ...coveredBy.map((test) => ({
          type: "covered_by",
          from: id,
          to: test,
        })),
        ...(executableFor[id] ?? []).map((test) => ({
          type: "executable_for",
          from: id,
          to: test,
        })),
      ],
    });
  mkdirSync(join(sandbox.repoDir, ".kb", "proof"), { recursive: true });
  writeFileSync(
    join(sandbox.repoDir, ".kb", "proof", "integrations.json"),
    JSON.stringify({
      version: "kibi.proof-integration.v1",
      integrations: [
        {
          id: "command",
          producer: "command",
          command: ["node", "run-proofs.mjs"],
          artifact: ".kb/proof/runs/command.json",
          targets: ["default"],
          description: "Runs the palette proofs, which leave certificates.",
        },
      ],
    }),
  );
  const sync = await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"]);
  assert.strictEqual(sync.exitCode, 0, sync.stdout + sync.stderr);
  return { claimKey, countKey, pairKeys };
}

/** The claim_bindings block of a test's latest receipt, as YAML text. */
function latestBindings(sandbox: TestSandbox, testId: string): string {
  const document = readFileSync(
    join(sandbox.repoDir, ".kb", "tests", `${testId}.md`),
    "utf8",
  );
  const frontmatter = document.split(/^---$/m)[1] ?? "";
  const latest = frontmatter.split(/^ {2}- version: /m).at(-1) ?? "";
  return latest.split(/^ {4}claim_bindings:/m)[1] ?? "";
}

/**
 * Provisions the palette fixture, runs kibi prove --all, and checks how each
 * certificate binds to the claim it names.
 */
export async function checkClaimBoundProofs(
  sandbox: TestSandbox,
): Promise<void> {
  const { claimKey, countKey, pairKeys } = await provision(sandbox);
  const prove = await kibi(sandbox, ["prove", "--all"], { timeoutMs: 240000 });
  assert.strictEqual(prove.exitCode, 0, prove.stdout + prove.stderr);
  assert.match(
    prove.stderr,
    new RegExp(
      `TEST-COLORS-EXACT ${claimKey} \\(REQ-PALETTE\\): derived, code scope`,
    ),
  );
  // The count claim is proved from COLORS.length, read by Kibi.
  assert.match(
    prove.stderr,
    new RegExp(
      `TEST-COLORS-COUNT ${countKey} \\(REQ-PALETTE-COUNT\\): derived, code scope`,
    ),
    prove.stderr,
  );

  const exact = latestBindings(sandbox, "TEST-COLORS-EXACT");
  assert.match(exact, /binding: derived/, exact);
  assert.match(exact, /kind: set_equals/);
  const narrow = latestBindings(sandbox, "TEST-COLORS-NARROW");
  assert.match(narrow, /binding: rejected/, narrow);
  assert.match(narrow, /missing blue/);
  const unknown = latestBindings(sandbox, "TEST-COLORS-UNKNOWN");
  assert.match(unknown, /binding: rejected/, unknown);
  assert.match(unknown, /is not a claim of any current requirement/);
  assert.strictEqual(latestBindings(sandbox, "TEST-COLORS-UNBOUND"), "");

  const check = await kibi(sandbox, [
    "check",
    "--rules",
    "proof-contract-claims",
    "--format",
    "json",
  ]);
  const findings = JSON.stringify(
    JSON.parse(check.stdout).structuredContent.violations,
  );
  assert.match(findings, /TEST-COLORS-UNBOUND/, findings);
  assert.match(findings, /TEST-COLORS-UNKNOWN proves CLAIM-0000000000000BAD/);
  assert.doesNotMatch(findings, /TEST-COLORS-EXACT/);

  const explain = await kibi(sandbox, ["proof", "explain", "REQ-PALETTE"]);
  assert.strictEqual(explain.exitCode, 0, explain.stdout + explain.stderr);
  assert.match(explain.stdout, /proofStatus: tested/, explain.stdout);
  assert.match(explain.stdout, /Claims \(1\/1 proved/, explain.stdout);
  assert.match(
    explain.stdout,
    /TEST-COLORS-EXACT exhaustive: derived \(code\)/,
    explain.stdout,
  );
  assert.match(
    explain.stdout,
    /TEST-COLORS-NARROW exhaustive: rejected/,
    explain.stdout,
  );
  const count = await kibi(sandbox, ["proof", "explain", "REQ-PALETTE-COUNT"]);
  assert.match(count.stdout, /Claims \(1\/1 proved/, count.stdout);

  // One of two applicable claims is certified: the requirement is not proved.
  const [pairSetKey, pairCountKey] = pairKeys;
  assert.match(
    prove.stderr,
    new RegExp(
      `TEST-COLORS-PAIR ${pairSetKey} \\(REQ-PALETTE-PAIR\\): derived, code scope`,
    ),
    prove.stderr,
  );
  assert.match(explain.stdout, /evidenceLevel: proved/, explain.stdout);
  const coverage = await kibi(sandbox, [
    "coverage",
    "--include-passing",
    "--format",
    "json",
  ]);
  assert.strictEqual(coverage.exitCode, 0, coverage.stdout + coverage.stderr);
  const rows = JSON.parse(coverage.stdout).rows as {
    id: string;
    proofStatus: string;
    evidenceLevel: string;
    unprovedClaims: string[];
    claimSummary: { applicable: number; proved: number; tested: number };
  }[];
  const pairRow = rows.find((row) => row.id === "REQ-PALETTE-PAIR");
  assert.ok(pairRow, coverage.stdout);
  // Tested end to end, failure side included, yet not proved.
  assert.strictEqual(pairRow.proofStatus, "tested", JSON.stringify(pairRow));
  assert.strictEqual(pairRow.evidenceLevel, "tested", JSON.stringify(pairRow));
  assert.deepStrictEqual(pairRow.unprovedClaims, [pairCountKey]);
  assert.strictEqual(pairRow.claimSummary.applicable, 2);
  assert.strictEqual(pairRow.claimSummary.proved, 1);
  assert.strictEqual(
    rows.find((row) => row.id === "REQ-PALETTE")?.evidenceLevel,
    "proved",
  );
  const pair = await kibi(sandbox, ["proof", "explain", "REQ-PALETTE-PAIR"]);
  assert.strictEqual(pair.exitCode, 0, pair.stdout + pair.stderr);
  assert.match(pair.stdout, /evidenceLevel: tested/, pair.stdout);
  assert.match(pair.stdout, /Claims \(1\/2 proved/, pair.stdout);
  assert.match(
    pair.stdout,
    new RegExp(`${pairCountKey} tested \\(modeled\\)`),
    pair.stdout,
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: claim-bound proofs", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init", "--no-hooks"]);
      },
      { timeout: 240000 },
    );

    after(
      async () => {
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 120000 },
    );

    it(
      "binds a certificate to the claims it derives and rejects the rest with the reason",
      { timeout: 300000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await checkClaimBoundProofs(sandbox);
      },
    );
  });
}
