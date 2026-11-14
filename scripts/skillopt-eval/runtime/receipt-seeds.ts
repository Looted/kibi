/**
 * Evaluator-owned fixtures for the kibi-traceability proof-receipt cases. The
 * seeded fresh KB gains a modeled requirement whose scenarios are verified by
 * one end-to-end test with a proof contract and a command integration, so
 * `kibi prove` can give it a passing receipt.
 *
 * The agent sees only the MCP tools, so it cannot run `kibi prove` itself.
 * Where a case needs a new run, the evaluator runs the current contract on
 * the final snapshot and leaves the kibi.proof-run.v1 artifact at
 * PROOF_RUN_FILE (ignored by Git, so it does not change the snapshot) for the
 * agent to ingest with kb_ingest_proof. The receipt that run wrote is
 * removed again, so the KB holds only what the case's premise describes.
 */
import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import {
  FixtureSetupError,
  commitAndSync,
  runCliWithRetry,
  runStagedCli,
  semanticLedger,
  setupSeededFreshKb,
} from "./fixture-kb-setup";
import { PROOF_RUN_FILE, RECEIPT_IDS } from "./traceability-seeds";

const execFileAsync = promisify(execFile);

const TEST_PATH = ".kb/tests/TEST-SETUP-E2E.md";
const REQUIREMENT_PATH = `.kb/requirements/${RECEIPT_IDS.requirement}.md`;
const RUNNER_PATH = "tests/fixture-e2e.mjs";
const RUN_ARTIFACT = `.kb/proof/runs/${RECEIPT_IDS.integration}.json`;

const BOUND_CLAUSE =
  "The fixture family name must be at least 1 character long.";
const GAP_CLAUSE = "Every family name change must be announced to consumers.";

type SuccessPolicy = "all_required_first_attempt" | "own_results_first_attempt";

function doc(frontmatter: readonly string[], body: string): string {
  return ["---", ...frontmatter, "---", "", body, ""].join("\n");
}

function lengthFact(length: number): string {
  return doc(
    [
      `id: FACT-fixture-family-length-${length}`,
      `title: Fixture family name ${length} characters long`,
      "type: fact",
      "status: active",
      "fact_kind: property_value",
      "subject_key: fixture.family",
      "property_key: length",
      "unit: character",
      "operator: eq",
      "value_type: int",
      `value_int: ${length}`,
    ],
    `An observed fixture family name exactly ${length} characters long, assumed by a scenario that checks the length bound.`,
  );
}

const SCENARIOS = [
  {
    id: "SCEN-SETUP-FAMILY-ONE",
    title: "A one-character fixture family name is accepted",
    expects: "success",
    length: 1,
    body: "Given a fixture family name one character long, when a consumer reads it, then the name is accepted.",
  },
  {
    id: "SCEN-SETUP-FAMILY-EMPTY",
    title: "An empty fixture family name is rejected",
    expects: "rejection",
    length: 0,
    body: "Given an empty fixture family name, when a consumer reads it, then the name is rejected.",
  },
  {
    id: "SCEN-SETUP-FAMILY-LONG",
    title: "A longer fixture family name is accepted",
    expects: "success",
    length: 2,
    body: "Given a fixture family name two characters long, when a consumer reads it, then the name is accepted.",
  },
] as const;

function testDocument(policy: SuccessPolicy): string {
  return doc(
    [
      `id: ${RECEIPT_IDS.test}`,
      "title: Fixture family end-to-end check",
      "status: active",
      `text_ref: ${RUNNER_PATH}`,
      "verification_scope: end_to_end",
      "verification_perspective: consumer",
      "links:",
      ...SCENARIOS.flatMap((scenario) => [
        "  - type: validates",
        `    target: ${scenario.id}`,
      ]),
      "proof_contract:",
      "  version: kibi.proof-contract.v1",
      `  integration: ${RECEIPT_IDS.integration}`,
      "  required_proofs:",
      `    - symbol_id: ${RECEIPT_IDS.runner}`,
      "      target: default",
      `  success_policy: ${policy}`,
    ],
    "This evaluator-owned end-to-end test reads the fixture package the way a consumer does and checks that its family string is not empty.",
  );
}

const RUNNER_SOURCE = [
  'import { readFileSync } from "node:fs";',
  "",
  "export function checkFixtureFamily() {",
  '  const source = readFileSync(new URL("../src/fixture.ts", import.meta.url), "utf8");',
  '  const match = /fixtureFamily = "([^"]+)"/.exec(source);',
  "  if (match === null || match[1].length === 0) process.exit(1);",
  "}",
  "",
  "checkFixtureFamily();",
  "",
].join("\n");

/** Documents every receipt fixture adds, apart from the requirement. */
function receiptDocuments(policy: SuccessPolicy): Record<string, string> {
  return {
    [`.kb/facts/${RECEIPT_IDS.subject}.md`]: doc(
      [
        `id: ${RECEIPT_IDS.subject}`,
        "title: Fixture family name",
        "type: fact",
        "status: active",
        "fact_kind: subject",
        "subject_key: fixture.family",
      ],
      "The family string the fixture package exports to its consumers; it is not a package or directory name.",
    ),
    ...Object.fromEntries(
      SCENARIOS.flatMap((scenario) => [
        [
          `.kb/facts/FACT-fixture-family-length-${scenario.length}.md`,
          lengthFact(scenario.length),
        ],
        [
          `.kb/scenarios/${scenario.id}.md`,
          doc(
            [
              `id: ${scenario.id}`,
              `title: ${scenario.title}`,
              "status: active",
              `expects: ${scenario.expects}`,
              "links:",
              "  - type: assumes",
              `    target: FACT-fixture-family-length-${scenario.length}`,
              "  - type: verified_by",
              `    target: ${RECEIPT_IDS.test}`,
            ],
            scenario.body,
          ),
        ],
      ]),
    ),
    [TEST_PATH]: testDocument(policy),
    [RUNNER_PATH]: RUNNER_SOURCE,
    ".kb/proof/integrations.json": `${JSON.stringify({
      version: "kibi.proof-integration.v1",
      integrations: [
        {
          id: RECEIPT_IDS.integration,
          producer: "command",
          command: ["node", RUNNER_PATH],
          targets: ["default"],
        },
      ],
    })}\n`,
  };
}

/**
 * The requirement and the fact that grounds its length bound, from the
 * semantic advisor's ledger of the prose. With `ontologyGap`, a second
 * clause no fact can ground stays unmodeled, so proof stays unresolved.
 */
async function requirementDocuments(
  workspace: string,
  cliRoot: string,
  ontologyGap: boolean,
): Promise<Record<string, string>> {
  const prose = ontologyGap ? `${BOUND_CLAUSE} ${GAP_CLAUSE}` : BOUND_CLAUSE;
  const ledger = await semanticLedger(cliRoot, workspace, prose);
  const [bound, gap] = ledger.propositions;
  if (
    bound === undefined ||
    ledger.propositions.length !== (ontologyGap ? 2 : 1) ||
    (ontologyGap && gap?.status !== "ontology_gap")
  )
    throw new FixtureSetupError(
      `receipt fixture ledger is unexpected: ${JSON.stringify(ledger.propositions)}`,
    );
  const inventory = [
    { ...bound, status: "modeled" },
    ...(gap === undefined ? [] : [{ ...gap, subjects: ["fixture.family"] }]),
  ];
  return {
    [`.kb/facts/${RECEIPT_IDS.bound}.md`]: doc(
      [
        `id: ${RECEIPT_IDS.bound}`,
        "title: Fixture family name length at least 1",
        "type: fact",
        "status: active",
        "fact_kind: property_value",
        "subject_key: fixture.family",
        "property_key: length",
        "unit: character",
        "operator: gte",
        "value_type: int",
        "value_int: 1",
        `claim_key: ${bound.claim_key}`,
        `claim_text: ${bound.claim_text}`,
      ],
      "The length bound the fixture family name requirement states, grounding its modeled clause.",
    ),
    [REQUIREMENT_PATH]: doc(
      [
        `id: ${RECEIPT_IDS.requirement}`,
        "title: Fixture family name is non-empty",
        "type: req",
        "status: open",
        // An unresolved clause cannot reach tested evidence, so the gap
        // variant asks for no more than its modeled checks give.
        `required_evidence: ${ontologyGap ? "asserted" : "tested"}`,
        `semantic_text: ${prose}`,
        `semantic_inventory_version: ${ledger.contract.version}`,
        `semantic_source_field: ${ledger.contract.source_field}`,
        `semantic_source_hash: ${ledger.contract.source_hash}`,
        "semantic_inventory:",
        ...inventory.flatMap((claim) => [
          `  - claim_key: ${claim.claim_key}`,
          `    claim_text: ${claim.claim_text}`,
          `    role: ${claim.role}`,
          `    status: ${claim.status}`,
          `    span: {start: ${claim.span.start}, end: ${claim.span.end}}`,
          ...(claim.subjects === undefined
            ? []
            : [`    subjects: [${claim.subjects.join(", ")}]`]),
        ]),
        `logic_claims: [${inventory.map((claim) => claim.claim_key).join(", ")}]`,
        "links:",
        "  - type: constrains",
        `    target: ${RECEIPT_IDS.subject}`,
        "  - type: requires_property",
        `    target: ${RECEIPT_IDS.bound}`,
        ...SCENARIOS.flatMap((scenario) => [
          "  - type: specified_by",
          `    target: ${scenario.id}`,
        ]),
      ],
      [
        prose,
        "",
        "## Context",
        "",
        "Evaluator-owned fixture requirement: consumers group their reports by the family string, so an empty one would break every report.",
      ].join("\n"),
    ),
  };
}

async function edit(
  workspace: string,
  path: string,
  change: (content: string) => string,
): Promise<void> {
  const target = join(workspace, path);
  const before = await readFile(target, "utf8");
  const after = change(before);
  if (after === before)
    throw new FixtureSetupError(`receipt fixture could not edit ${path}`);
  await writeFile(target, after, "utf8");
}

async function cli(
  workspace: string,
  cliRoot: string,
  args: readonly string[],
  label: string,
): Promise<string> {
  return runCliWithRetry(() => runStagedCli(cliRoot, workspace, args), label, {
    retryOnInteractivePrologTimeout: true,
  });
}

/**
 * The seeded fresh KB plus the contracted end-to-end chain, committed and
 * synced, with no receipt yet.
 */
async function setupContractedChain(
  workspace: string,
  cliRoot: string,
  options: Readonly<{ policy: SuccessPolicy; ontologyGap: boolean }>,
): Promise<void> {
  await setupSeededFreshKb(workspace, cliRoot, {
    documents: receiptDocuments(options.policy),
  });
  await writeFiles(
    workspace,
    await requirementDocuments(workspace, cliRoot, options.ontologyGap),
  );
  // The seeded base requirement only anchors the fixture links; it states no
  // behavior, so proof does not apply to it.
  await edit(workspace, `.kb/requirements/${RECEIPT_IDS.base}.md`, (text) =>
    text.replace(
      "type: req\n",
      "type: req\nproof_exempt: true\nproof_exempt_reason: The requirement only anchors the seeded fixture links and states no behavior to test.\n",
    ),
  );
  await edit(workspace, ".kb/symbols.yaml", (text) =>
    [
      text
        .trimEnd()
        .replace(
          `        target: ${RECEIPT_IDS.base}\n`,
          `        target: ${RECEIPT_IDS.base}\n      - type: implements\n        target: ${RECEIPT_IDS.requirement}\n`,
        ),
      "      - type: covered_by",
      `        target: ${RECEIPT_IDS.test}`,
      `  - id: ${RECEIPT_IDS.runner}`,
      "    title: checkFixtureFamily",
      "    status: active",
      `    sourceFile: ${RUNNER_PATH}`,
      "    symbol_role: behavioral",
      "    relationships:",
      "      - type: executable_for",
      `        target: ${RECEIPT_IDS.test}`,
      "",
    ].join("\n"),
  );
  // The evaluator's run lands in an ignored path, outside the snapshot.
  await edit(
    workspace,
    ".gitignore",
    (text) => `${text.trimEnd()}\nproof-runs/\n`,
  );
  await commitAndSync(workspace, cliRoot);
}

async function writeFiles(
  workspace: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(workspace, path)), { recursive: true });
    await writeFile(join(workspace, path), content, "utf8");
  }
}

async function prove(workspace: string, cliRoot: string): Promise<void> {
  await cli(
    workspace,
    cliRoot,
    ["prove", "--test", RECEIPT_IDS.test],
    "kibi prove",
  );
}

/** Prove the test and commit its receipt as tracked history. */
async function commitReceipt(
  workspace: string,
  cliRoot: string,
): Promise<void> {
  await prove(workspace, cliRoot);
  await commitAndSync(workspace, cliRoot);
}

/**
 * Run the current contract on the committed snapshot, keep the run artifact
 * at PROOF_RUN_FILE, and drop the receipt the run wrote so the agent's ingest
 * is what appends it.
 */
async function captureCurrentRun(
  workspace: string,
  cliRoot: string,
): Promise<void> {
  await prove(workspace, cliRoot);
  await mkdir(dirname(join(workspace, PROOF_RUN_FILE)), { recursive: true });
  await copyFile(
    join(workspace, RUN_ARTIFACT),
    join(workspace, PROOF_RUN_FILE),
  );
  await execFileAsync("git", ["checkout", "--", TEST_PATH], { cwd: workspace });
  // The ingest wrote the store directly; rebuild it from the restored
  // sources so the receipt is gone from the KB too.
  await cli(
    workspace,
    cliRoot,
    ["sync", "--rebuild"],
    "rebuild after the evaluator run",
  );
}

/** A passing receipt on the current snapshot and contract. */
export async function setupReceiptReuse(
  workspace: string,
  cliRoot: string,
): Promise<void> {
  await setupContractedChain(workspace, cliRoot, {
    policy: "all_required_first_attempt",
    ontologyGap: false,
  });
  await commitReceipt(workspace, cliRoot);
}

/**
 * A receipt for the earlier contract (own-results policy) is committed, then
 * the contract tightened to the all-required policy; the evaluator ran the
 * current contract.
 */
export async function setupContractDrift(
  workspace: string,
  cliRoot: string,
): Promise<void> {
  await setupContractedChain(workspace, cliRoot, {
    policy: "own_results_first_attempt",
    ontologyGap: false,
  });
  await commitReceipt(workspace, cliRoot);
  await edit(workspace, TEST_PATH, (text) =>
    text.replace(
      "success_policy: own_results_first_attempt",
      "success_policy: all_required_first_attempt",
    ),
  );
  await commitAndSync(workspace, cliRoot);
  await captureCurrentRun(workspace, cliRoot);
}

/**
 * Receipts passed on the standardization snapshot; final integration then
 * merged dependency pins, so the final snapshot differs. The evaluator ran
 * the current contract on the final snapshot.
 */
export async function setupFinalIntegration(
  workspace: string,
  cliRoot: string,
): Promise<void> {
  await setupContractedChain(workspace, cliRoot, {
    policy: "all_required_first_attempt",
    ontologyGap: false,
  });
  await commitReceipt(workspace, cliRoot);
  await edit(workspace, "package.json", (text) => {
    const manifest = JSON.parse(text) as Record<string, unknown>;
    return `${JSON.stringify(
      { ...manifest, dependencies: { "left-pad": "1.3.0" } },
      null,
      2,
    )}\n`;
  });
  await commitAndSync(workspace, cliRoot);
  await captureCurrentRun(workspace, cliRoot);
}

/**
 * The requirement keeps an ontology-gap clause; the test has no receipt yet
 * and the evaluator ran its contract.
 */
export async function setupOntologyGapRun(
  workspace: string,
  cliRoot: string,
): Promise<void> {
  await setupContractedChain(workspace, cliRoot, {
    policy: "all_required_first_attempt",
    ontologyGap: true,
  });
  await captureCurrentRun(workspace, cliRoot);
}
