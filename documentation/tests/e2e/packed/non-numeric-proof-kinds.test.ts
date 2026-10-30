import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
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
 * E2E: rule, state_machine and regex certificates prove claims that are not
 * numbers, against the model Kibi reads from the code itself.
 *
 * SCEN-kibi-non-numeric-proof-kinds — the semantic advisor models "Invoice
 * numbers must match `INV-[0-9]{6}`" as a string fact with operator matches
 * and "Invoice status transitions must be one of draft -> sent, ..." as a
 * transitions set fact; model-requirement records "Archived documents must
 * never be shared" as a kibi.logic.v1 rule. A regex test over the code's
 * anchored pattern, a state_machine test over its transition table and a
 * rule test over its sharing function each get a derived binding. A pattern
 * that also accepts longer strings is rejected with a string that tells the
 * two apart, a transition table with one transition the set fact does not
 * name is rejected with that transition, and a sharing function that lets
 * owners share archived
 * documents is rejected with the assignment that breaks the rule. The
 * advisor models "Every role in owner and editor must be able to invite
 * members" as an includes set fact; a rule test over the invite check derives
 * it, and the same check refutes the claim that adds viewer.
 */

type Step = Readonly<{
  type: string;
  id: string;
  properties: Record<string, unknown>;
  relationships?: readonly Record<string, string>[];
}>;

const PATTERN_STATEMENT = "Invoice numbers must match `INV-[0-9]{6}`.";
const MACHINE_STATEMENT =
  "Invoice status transitions must be one of draft -> sent, draft -> void, sent -> paid, sent -> void.";
const RULE_STATEMENT = "Archived documents must never be shared.";
const INVITE_STATEMENT =
  "Every role in owner and editor must be able to invite members.";
const INVITE_ALL_STATEMENT =
  "Every role in owner, editor and viewer must be able to invite members.";
/** The predicate the advisor names after the property every member has. */
const INVITE_PREDICATE = "be_able_to_invite_members";

const v = (name: string, type: string) => ({ kind: "var", name, type });
const RULE_IR = {
  version: "kibi.logic.v1",
  kind: "rule",
  modality: "forbid",
  variables: [
    { name: "D", type: "document_status" },
    { name: "R", type: "role" },
  ],
  head: {
    kind: "atom",
    name: "can_share",
    args: [v("D", "document_status"), v("R", "role")],
  },
  body: {
    kind: "all",
    items: [
      { kind: "atom", name: "archived", args: [v("D", "document_status")] },
      { kind: "atom", name: "role", args: [v("R", "role")] },
    ],
  },
};

function sources(certificatesModule: string): Record<string, string> {
  return {
    "invoices.mjs": `export const INVOICE_NUMBER = /^INV-\\d{6}$/;
export const LOOSE_NUMBER = /INV-\\d{6}/;
export const TRANSITIONS = { draft: ["sent", "void"], sent: ["paid", "void"], paid: [], void: [] };
export const LEAKY_TRANSITIONS = { draft: ["sent", "void"], sent: ["paid", "void"], paid: ["draft"], void: [] };
`,
    "documents.mjs": `export const STATUSES = ["draft", "active", "archived"];
export const ROLES = ["viewer", "editor", "owner"];
export function canShare(status, role) {
  return status !== "archived" && role === "owner";
}
export function leakyShare(status, role) {
  return role === "owner";
}
export function isArchived(status) {
  return status === "archived";
}
export function canInvite(role) {
  return role !== "viewer";
}
`,
    "emit.mjs": `import {
  regexCertificate,
  ruleCertificate,
  stateMachineCertificate,
  writeCodeCertificate,
} from ${JSON.stringify(certificatesModule)};
const selected = new Set(JSON.parse(process.env.KIBI_PROOF_TEST_IDS ?? "[]"));
export async function emit(testId, build) {
  if (!selected.has(testId)) return;
  writeCodeCertificate(await build(testId));
}
export { regexCertificate, ruleCertificate, stateMachineCertificate };
`,
    "invoice-proof.mjs": `import { INVOICE_NUMBER, LEAKY_TRANSITIONS, LOOSE_NUMBER, TRANSITIONS } from "./invoices.mjs";
import { emit, regexCertificate, stateMachineCertificate } from "./emit.mjs";
export async function proveInvoices() {
  await emit("TEST-INVOICE-NUMBER", (testId) =>
    regexCertificate({ testId, symbolId: "SYM-INVOICE-NUMBER", value: INVOICE_NUMBER }));
  await emit("TEST-INVOICE-NUMBER-LOOSE", (testId) =>
    regexCertificate({ testId, symbolId: "SYM-LOOSE-NUMBER", value: LOOSE_NUMBER }));
  await emit("TEST-INVOICE-MACHINE", (testId) =>
    stateMachineCertificate({ testId, symbolId: "SYM-TRANSITIONS", transitions: TRANSITIONS }));
  await emit("TEST-INVOICE-MACHINE-LEAKY", (testId) =>
    stateMachineCertificate({ testId, symbolId: "SYM-LEAKY-TRANSITIONS", transitions: LEAKY_TRANSITIONS }));
}
await proveInvoices();
`,
    "sharing-proof.mjs": `import { ROLES, STATUSES, canInvite, canShare, isArchived, leakyShare } from "./documents.mjs";
import { emit, ruleCertificate } from "./emit.mjs";
const domains = {
  document_status: { symbolId: "SYM-STATUSES", members: STATUSES },
  role: { symbolId: "SYM-ROLES", members: ROLES },
};
const archived = { symbolId: "SYM-IS-ARCHIVED", argTypes: ["document_status"], decide: isArchived };
export async function proveSharing() {
  await emit("TEST-SHARING-RULE", (testId) =>
    ruleCertificate({
      testId,
      domains,
      predicates: {
        can_share: { symbolId: "SYM-CAN-SHARE", argTypes: ["document_status", "role"], decide: canShare },
        archived,
      },
    }));
  await emit("TEST-SHARING-LEAKY", (testId) =>
    ruleCertificate({
      testId,
      domains,
      predicates: {
        can_share: { symbolId: "SYM-LEAKY-SHARE", argTypes: ["document_status", "role"], decide: leakyShare },
        archived,
      },
    }));
  for (const testId of ["TEST-INVITE-RULE", "TEST-INVITE-ALL"])
    await emit(testId, (id) =>
      ruleCertificate({
        testId: id,
        domains: { role: domains.role },
        predicates: {
          ${INVITE_PREDICATE}: { symbolId: "SYM-CAN-INVITE", argTypes: ["role"], decide: canInvite },
        },
      }));
}
await proveSharing();
`,
    "run-proofs.mjs":
      'await import("./invoice-proof.mjs");\nawait import("./sharing-proof.mjs");\n',
  };
}

async function upsert(sandbox: TestSandbox, payload: unknown): Promise<void> {
  const request = join(sandbox.repoDir, "upsert-request.json");
  writeFileSync(request, JSON.stringify(payload));
  const result = await kibi(sandbox, ["upsert", "--input", request]);
  assert.strictEqual(result.exitCode, 0, result.stdout + result.stderr);
}

/** The advisor's apply plan for a statement, from its first modeled claim. */
async function advisorPlan(
  sandbox: TestSandbox,
  id: string,
  text: string,
): Promise<Step[]> {
  const request = join(sandbox.repoDir, "model-request.json");
  writeFileSync(
    request,
    JSON.stringify({ mode: "analyze", type: "req", id, text }),
  );
  const model = await kibi(sandbox, ["model", "--input", request]);
  assert.strictEqual(model.exitCode, 0, model.stdout + model.stderr);
  const suggestion = JSON.parse(model.stdout).data.receipt.suggestions[0];
  assert.ok(suggestion?.applyPlan, `no suggestion:\n${model.stdout}`);
  return suggestion.applyPlan as Step[];
}

/** model-requirement's apply plan for a statement with a logic IR. */
async function logicPlan(
  sandbox: TestSandbox,
  id: string,
  text: string,
): Promise<Step[]> {
  const request = join(sandbox.repoDir, "logic-request.json");
  writeFileSync(
    request,
    JSON.stringify({ text, requirementId: id, logic: RULE_IR }),
  );
  const model = await kibi(sandbox, ["model-requirement", "--input", request]);
  assert.strictEqual(model.exitCode, 0, model.stdout + model.stderr);
  return JSON.parse(model.stdout).data.applyPlan as Step[];
}

/** Upsert a plan, linking its requirement to the scenario; return the claim key. */
async function applyPlan(
  sandbox: TestSandbox,
  plan: readonly Step[],
  scenario: string,
): Promise<string> {
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
  const requirement = plan.find((step) => step.type === "req");
  const claimKey = (
    requirement?.properties.semantic_inventory as { claim_key: string }[]
  )[0]?.claim_key;
  assert.match(claimKey ?? "", /^CLAIM-/);
  return claimKey ?? "";
}

type TestSpec = Readonly<{
  id: string;
  requirement: string;
  runner: string;
  kind: string;
  claim: string;
  contract: string;
}>;

function testDocument(spec: TestSpec): string {
  return `---
id: ${spec.id}
title: ${spec.kind} proof ${spec.id}
status: passing
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: command
  required_proofs:
    - symbol_id: ${spec.runner}
      target: default
  success_policy: all_required_first_attempt
  kind: ${spec.kind}
${spec.contract}  proves:
    - ${spec.claim}
type: test
---

Leaves a ${spec.kind} certificate for kibi prove.
`;
}

async function provision(
  sandbox: TestSandbox,
): Promise<Record<string, string>> {
  const certificatesModule = pathToFileURL(
    join(
      sandbox.npmPrefix,
      "node_modules",
      "kibi-cli",
      "dist",
      "public",
      "proof-certificates.js",
    ),
  ).href;
  for (const [file, content] of Object.entries(sources(certificatesModule))) {
    writeFileSync(join(sandbox.repoDir, file), content);
    stageSourceFile(sandbox, file);
  }
  const synced = await kibi(sandbox, ["sync"]);
  assert.strictEqual(synced.exitCode, 0, synced.stdout + synced.stderr);

  for (const [id, title] of [
    ["SCEN-INVOICES", "Number and route invoices"],
    ["SCEN-SHARING", "Share documents"],
  ])
    await upsert(sandbox, {
      type: "scenario",
      id,
      properties: { title, status: "active" },
    });
  const claims = {
    pattern: await applyPlan(
      sandbox,
      await advisorPlan(sandbox, "REQ-INVOICE-NUMBER", PATTERN_STATEMENT),
      "SCEN-INVOICES",
    ),
    machine: await applyPlan(
      sandbox,
      await advisorPlan(sandbox, "REQ-INVOICE-STATES", MACHINE_STATEMENT),
      "SCEN-INVOICES",
    ),
    rule: await applyPlan(
      sandbox,
      await logicPlan(sandbox, "REQ-SHARING", RULE_STATEMENT),
      "SCEN-SHARING",
    ),
    invite: "",
    inviteAll: "",
  };
  for (const [key, id, statement] of [
    ["invite", "REQ-INVITE", INVITE_STATEMENT],
    ["inviteAll", "REQ-INVITE-ALL", INVITE_ALL_STATEMENT],
  ] as const) {
    const plan = await advisorPlan(sandbox, id, statement);
    const setFact = plan.find(
      (step) => step.type === "fact" && step.properties.value_type === "set",
    );
    assert.strictEqual(setFact?.properties.operator, "includes");
    assert.strictEqual(setFact?.properties.property_key, INVITE_PREDICATE);
    claims[key] = await applyPlan(sandbox, plan, "SCEN-SHARING");
  }

  const ruleContract = (canShare: string) => `  predicate_source:
    can_share:
      symbol_id: ${canShare}
    archived:
      symbol_id: SYM-IS-ARCHIVED
  domains:
    document_status:
      symbol_id: SYM-STATUSES
    role:
      symbol_id: SYM-ROLES
`;
  const inviteContract = `  predicate_source:
    ${INVITE_PREDICATE}:
      symbol_id: SYM-CAN-INVITE
  domains:
    role:
      symbol_id: SYM-ROLES
`;
  const tests: TestSpec[] = [
    {
      id: "TEST-INVOICE-NUMBER",
      requirement: "REQ-INVOICE-NUMBER",
      runner: "SYM-PROOF-INVOICES",
      kind: "regex",
      claim: claims.pattern,
      contract: "  pattern_source:\n    symbol_id: SYM-INVOICE-NUMBER\n",
    },
    {
      id: "TEST-INVOICE-NUMBER-LOOSE",
      requirement: "REQ-INVOICE-NUMBER",
      runner: "SYM-PROOF-INVOICES",
      kind: "regex",
      claim: claims.pattern,
      contract: "  pattern_source:\n    symbol_id: SYM-LOOSE-NUMBER\n",
    },
    {
      id: "TEST-INVOICE-MACHINE",
      requirement: "REQ-INVOICE-STATES",
      runner: "SYM-PROOF-INVOICES",
      kind: "state_machine",
      claim: claims.machine,
      contract: "  domain_source:\n    symbol_id: SYM-TRANSITIONS\n",
    },
    {
      id: "TEST-INVOICE-MACHINE-LEAKY",
      requirement: "REQ-INVOICE-STATES",
      runner: "SYM-PROOF-INVOICES",
      kind: "state_machine",
      claim: claims.machine,
      contract: "  domain_source:\n    symbol_id: SYM-LEAKY-TRANSITIONS\n",
    },
    {
      id: "TEST-SHARING-RULE",
      requirement: "REQ-SHARING",
      runner: "SYM-PROOF-SHARING",
      kind: "rule",
      claim: claims.rule,
      contract: ruleContract("SYM-CAN-SHARE"),
    },
    {
      id: "TEST-SHARING-LEAKY",
      requirement: "REQ-SHARING",
      runner: "SYM-PROOF-SHARING",
      kind: "rule",
      claim: claims.rule,
      contract: ruleContract("SYM-LEAKY-SHARE"),
    },
    {
      id: "TEST-INVITE-RULE",
      requirement: "REQ-INVITE",
      runner: "SYM-PROOF-SHARING",
      kind: "rule",
      claim: claims.invite,
      contract: inviteContract,
    },
    {
      id: "TEST-INVITE-ALL",
      requirement: "REQ-INVITE-ALL",
      runner: "SYM-PROOF-SHARING",
      kind: "rule",
      claim: claims.inviteAll,
      contract: inviteContract,
    },
  ];
  for (const spec of tests) {
    const relative = `.kb/tests/${spec.id}.md`;
    writeFileSync(join(sandbox.repoDir, relative), testDocument(spec));
    stageSourceFile(sandbox, relative);
  }
  const testsSynced = await kibi(sandbox, ["sync"]);
  assert.strictEqual(
    testsSynced.exitCode,
    0,
    testsSynced.stdout + testsSynced.stderr,
  );
  for (const spec of tests)
    await upsert(sandbox, {
      type: "test",
      id: spec.id,
      properties: {
        title: `${spec.kind} proof ${spec.id}`,
        status: "passing",
      },
      relationships: [
        {
          type: "validates",
          from: spec.id,
          to: spec.requirement.startsWith("REQ-INVOICE")
            ? "SCEN-INVOICES"
            : "SCEN-SHARING",
        },
      ],
    });

  // Each model symbol implements its requirement and is covered by the
  // tests that read it; the proof runners are the tests' executable code.
  const symbols: [string, string, string, string, string[]][] = [
    [
      "SYM-INVOICE-NUMBER",
      "INVOICE_NUMBER",
      "invoices.mjs",
      "REQ-INVOICE-NUMBER",
      ["TEST-INVOICE-NUMBER"],
    ],
    [
      "SYM-LOOSE-NUMBER",
      "LOOSE_NUMBER",
      "invoices.mjs",
      "REQ-INVOICE-NUMBER",
      ["TEST-INVOICE-NUMBER-LOOSE"],
    ],
    [
      "SYM-TRANSITIONS",
      "TRANSITIONS",
      "invoices.mjs",
      "REQ-INVOICE-STATES",
      ["TEST-INVOICE-MACHINE"],
    ],
    [
      "SYM-LEAKY-TRANSITIONS",
      "LEAKY_TRANSITIONS",
      "invoices.mjs",
      "REQ-INVOICE-STATES",
      ["TEST-INVOICE-MACHINE-LEAKY"],
    ],
    [
      "SYM-STATUSES",
      "STATUSES",
      "documents.mjs",
      "REQ-SHARING",
      ["TEST-SHARING-RULE", "TEST-SHARING-LEAKY"],
    ],
    [
      "SYM-ROLES",
      "ROLES",
      "documents.mjs",
      "REQ-SHARING",
      [
        "TEST-SHARING-RULE",
        "TEST-SHARING-LEAKY",
        "TEST-INVITE-RULE",
        "TEST-INVITE-ALL",
      ],
    ],
    [
      "SYM-CAN-INVITE",
      "canInvite",
      "documents.mjs",
      "REQ-INVITE",
      ["TEST-INVITE-RULE", "TEST-INVITE-ALL"],
    ],
    [
      "SYM-IS-ARCHIVED",
      "isArchived",
      "documents.mjs",
      "REQ-SHARING",
      ["TEST-SHARING-RULE", "TEST-SHARING-LEAKY"],
    ],
    [
      "SYM-CAN-SHARE",
      "canShare",
      "documents.mjs",
      "REQ-SHARING",
      ["TEST-SHARING-RULE"],
    ],
    [
      "SYM-LEAKY-SHARE",
      "leakyShare",
      "documents.mjs",
      "REQ-SHARING",
      ["TEST-SHARING-LEAKY"],
    ],
    ["SYM-PROOF-INVOICES", "proveInvoices", "invoice-proof.mjs", "", []],
    ["SYM-PROOF-SHARING", "proveSharing", "sharing-proof.mjs", "", []],
  ];
  const executableFor: Record<string, string[]> = {
    "SYM-PROOF-INVOICES": [
      "TEST-INVOICE-NUMBER",
      "TEST-INVOICE-NUMBER-LOOSE",
      "TEST-INVOICE-MACHINE",
      "TEST-INVOICE-MACHINE-LEAKY",
    ],
    "SYM-PROOF-SHARING": [
      "TEST-SHARING-RULE",
      "TEST-SHARING-LEAKY",
      "TEST-INVITE-RULE",
      "TEST-INVITE-ALL",
    ],
  };
  for (const [id, title, sourceFile, requirement, coveredBy] of symbols)
    await upsert(sandbox, {
      type: "symbol",
      id,
      properties: {
        title,
        status: "active",
        sourceFile,
        symbol_role: "behavioral",
      },
      relationships: [
        ...(requirement !== ""
          ? [{ type: "implements", from: id, to: requirement }]
          : []),
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
          description:
            "Runs the invoice and sharing proofs, which leave certificates.",
        },
      ],
    }),
  );
  const sync = await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"]);
  assert.strictEqual(sync.exitCode, 0, sync.stdout + sync.stderr);
  return claims;
}

/** The latest receipt of a test, as YAML text. */
function latestReceipt(sandbox: TestSandbox, testId: string): string {
  const document = readFileSync(
    join(sandbox.repoDir, ".kb", "tests", `${testId}.md`),
    "utf8",
  );
  const frontmatter = document.split(/^---$/m)[1] ?? "";
  return frontmatter.split(/^ {2}- version: /m).at(-1) ?? "";
}

/**
 * Provisions the invoice and sharing fixture, runs kibi prove --all, and
 * checks how each certificate binds to the claim it names.
 */
export async function checkNonNumericProofKinds(
  sandbox: TestSandbox,
): Promise<void> {
  const claims = await provision(sandbox);
  const prove = await kibi(sandbox, ["prove", "--all"], { timeoutMs: 240000 });
  assert.strictEqual(prove.exitCode, 0, prove.stdout + prove.stderr);

  const exact = latestReceipt(sandbox, "TEST-INVOICE-NUMBER");
  assert.match(exact, /evidence_level: proved/, exact);
  assert.match(exact, /binding: derived/, exact);
  assert.match(exact, /kind: string_constraint/);
  assert.match(
    prove.stderr,
    new RegExp(
      `TEST-INVOICE-NUMBER ${claims.pattern} \\(REQ-INVOICE-NUMBER\\): derived, code scope`,
    ),
  );
  const loose = latestReceipt(sandbox, "TEST-INVOICE-NUMBER-LOOSE");
  assert.match(loose, /binding: rejected/, loose);
  assert.match(loose, /is in the code''s pattern only/, loose);
  // The certificate re-checks but derives no claim, so the receipt supports
  // tested, the level coverage reports, not proved.
  assert.match(loose, /evidence_level: tested/, loose);

  const machine = latestReceipt(sandbox, "TEST-INVOICE-MACHINE");
  assert.match(machine, /evidence_level: proved/, machine);
  assert.match(machine, /binding: derived/, machine);
  assert.match(machine, /kind: machine_set/);
  // A table with one transition the set fact does not name proves nothing.
  const leakyMachine = latestReceipt(sandbox, "TEST-INVOICE-MACHINE-LEAKY");
  assert.match(leakyMachine, /binding: rejected/, leakyMachine);
  assert.match(leakyMachine, /paid->draft/, leakyMachine);
  assert.match(leakyMachine, /evidence_level: tested/, leakyMachine);

  const rule = latestReceipt(sandbox, "TEST-SHARING-RULE");
  assert.match(rule, /evidence_level: proved/, rule);
  assert.match(rule, /binding: derived/, rule);
  assert.match(rule, /kind: rule_holds/);
  const leaky = latestReceipt(sandbox, "TEST-SHARING-LEAKY");
  assert.match(leaky, /binding: rejected/, leaky);
  assert.match(
    leaky,
    /the code decides can_share\(archived, owner\) is true, but the rule requires false/,
    leaky,
  );

  // Two includes facts on one property coexist; the rule derives the true
  // one from the code and refutes the one that adds viewer.
  const invite = latestReceipt(sandbox, "TEST-INVITE-RULE");
  assert.match(invite, /evidence_level: proved/, invite);
  assert.match(invite, /binding: derived/, invite);
  assert.match(invite, /kind: every_member/, invite);
  const inviteAll = latestReceipt(sandbox, "TEST-INVITE-ALL");
  assert.match(inviteAll, /binding: rejected/, inviteAll);
  assert.match(
    inviteAll,
    new RegExp(`the code decides ${INVITE_PREDICATE}\\(viewer\\) is false`),
    inviteAll,
  );
  assert.match(inviteAll, /evidence_level: tested/, inviteAll);

  const explain = await kibi(sandbox, ["proof", "explain", "REQ-SHARING"]);
  assert.strictEqual(explain.exitCode, 0, explain.stdout + explain.stderr);
  assert.match(explain.stdout, /Claims \(1\/1 proved/, explain.stdout);
  assert.match(
    explain.stdout,
    /TEST-SHARING-RULE rule: derived \(code\)/,
    explain.stdout,
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: non-numeric proof kinds", () => {
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
      "proves pattern, state machine and rule claims against the code's own model",
      { timeout: 300000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await checkNonNumericProofKinds(sandbox);
      },
    );
  });
}
