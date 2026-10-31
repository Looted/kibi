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
  run,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * E2E: certificates over SWI-Prolog code prove claims against the model Kibi
 * reads from the Prolog code itself.
 *
 * SCEN-kibi-multilingual-code-proofs — a pure SWI-Prolog project declares
 * its mutation operators as operator/2 facts, its run statuses as status/1
 * facts, which statuses count as detected, and its run state machine as
 * transition/3 facts, with kibi-plugin-treesitter reading its predicates as
 * symbols. A Prolog proof file loads the module, writes its
 * certificates with the certificate module the kibi-usage skill ships, and
 * kibi prove re-reads every model with SWI-Prolog: the operator set (arg 1
 * of operator/2) and its count, the detection rule over every status, and
 * the transition table each get a derived binding. A domain predicate that
 * lacks an operator, a transition table with one extra transition and a
 * detection predicate that also counts survived mutants are each rejected
 * with what differs.
 */

type Step = Readonly<{
  type: string;
  id: string;
  properties: Record<string, unknown>;
  relationships?: readonly Record<string, string>[];
}>;

const OPERATORS_STATEMENT =
  "Mutation operators must be one of negate or swap_args.";
const COUNT_STATEMENT = "The library must have exactly 2 mutation operators.";
const MACHINE_STATEMENT =
  "Run status transitions must be one of pending -> running, running -> done, running -> failed.";
const DETECTED_STATEMENT =
  "Every status in killed and timeout must count as detected.";

const OPERATORS_MODULE = `:- module(operators, [operator/2]).
%! operator(?Name, ?Description) is nondet.
operator(negate, "Negate a goal").
operator(swap_args, "Swap two arguments").
operator(negate, "Negate a body goal").
legacy_operator(negate).
status(killed).
status(timeout).
status(survived).
detected(killed).
detected(timeout).
lenient_detected(killed).
lenient_detected(timeout).
lenient_detected(survived).
transition(pending, start, running).
transition(running, finish, done).
transition(running, crash, failed).
loose_transition(pending, start, running).
loose_transition(running, finish, done).
loose_transition(running, crash, failed).
loose_transition(failed, retry, pending).
initial(pending).
`;

/** The proof file: certificates for the tests kibi prove selected. */
function proofSource(detectedPredicate: string): string {
  return `:- use_module('../prolog/operators').
:- use_module(kibi_certificate).
:- use_module(library(http/json)).
:- initialization(main, main).

selected(TestId) :-
    getenv('KIBI_PROOF_TEST_IDS', Text),
    atom_json_term(Text, Ids, [value_string_as(atom)]),
    memberchk(TestId, Ids).

emit(TestId, Goal) :-
    (   selected(TestId)
    ->  call(Goal, TestId, Certificate),
        kibi_write_certificate(Certificate)
    ;   true
    ).

names(Goal, Names) :- findall(Name, call(Goal, Name), All), list_to_set(All, Names).
operator_name(Name) :- operator(Name, _).
legacy_name(Name) :- operators:legacy_operator(Name).

operators_certificate(Domain, Symbol, TestId, Certificate) :-
    names(Domain, Names),
    kibi_exhaustive_certificate(TestId, Symbol, Names, [N]>>atom(N), Certificate).

count_certificate(TestId, _{version: "kibi.code-certificate.v1", test_id: TestId,
                            kind: "arithmetic", variable: "count", value_type: "int",
                            assumptions: [_{operator: "eq", value: Count}],
                            claim: _{operator: "eq", value: 2}}) :-
    names(operator_name, Names),
    length(Names, Count).

detected_certificate(Decide, Symbol, TestId, Certificate) :-
    findall(S, operators:status(S), Statuses),
    kibi_rule_certificate(TestId, [domain(status, 'SYM-STATUS', Statuses)],
                          [predicate(${detectedPredicate}, Symbol, [status], Decide)],
                          Certificate).

machine_certificate(Table, Symbol, TestId, Certificate) :-
    findall(From-To, call(Table, From, _, To), Edges),
    findall(S, operators:initial(S), Initial),
    kibi_machine_certificate(TestId, Symbol, Edges, Initial, Certificate).

main :-
    emit('TEST-OPERATORS', operators_certificate(operator_name, 'SYM-OPERATOR')),
    emit('TEST-OPERATORS-LEGACY', operators_certificate(legacy_name, 'SYM-LEGACY-OPERATOR')),
    emit('TEST-OPERATOR-COUNT', count_certificate),
    emit('TEST-DETECTED', detected_certificate(operators:detected, 'SYM-DETECTED')),
    emit('TEST-DETECTED-LENIENT', detected_certificate(operators:lenient_detected, 'SYM-LENIENT-DETECTED')),
    emit('TEST-RUN-MACHINE', machine_certificate(operators:transition, 'SYM-TRANSITION')),
    emit('TEST-RUN-MACHINE-LOOSE', machine_certificate(operators:loose_transition, 'SYM-LOOSE-TRANSITION')).
`;
}

async function upsert(sandbox: TestSandbox, payload: unknown): Promise<void> {
  const request = join(sandbox.repoDir, "upsert-request.json");
  writeFileSync(request, JSON.stringify(payload));
  const result = await kibi(sandbox, ["upsert", "--input", request]);
  assert.strictEqual(result.exitCode, 0, result.stdout + result.stderr);
}

/** The advisor's apply plan for a statement, from its suggestion of a value type. */
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
  assert.ok(
    suggestion?.applyPlan,
    `no ${valueType} suggestion:\n${model.stdout}`,
  );
  return suggestion.applyPlan as Step[];
}

/** Upsert a plan, linking its requirement to the scenario; return the claim key. */
async function applyPlan(
  sandbox: TestSandbox,
  plan: readonly Step[],
): Promise<string> {
  for (const step of plan)
    await upsert(sandbox, {
      type: step.type,
      id: step.id,
      properties: step.properties,
      relationships: [
        ...(step.relationships ?? []),
        ...(step.type === "req"
          ? [{ type: "specified_by", from: step.id, to: "SCEN-MUTATION" }]
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

function testDocument(id: string, contract: string, claim: string): string {
  return `---
id: ${id}
title: Prolog proof ${id}
status: passing
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: command
  required_proofs:
    - symbol_id: SYM-PROOFS
      target: default
  success_policy: all_required_first_attempt
${contract}  proves:
    - ${claim}
type: test
---

Leaves a certificate over the Prolog code for kibi prove.
`;
}

/** The certificate module the kibi-usage skill ships, as installed. */
function certificateModule(sandbox: TestSandbox): string {
  const resource = readFileSync(
    join(
      sandbox.npmPrefix,
      "node_modules",
      "kibi-cli",
      "dist",
      "public",
      "skills",
      "kibi-usage",
      "resources",
      "prolog-proofs.md",
    ),
    "utf8",
  );
  const module = resource.match(
    /```prolog\n(:- module\(kibi_certificate[\s\S]*?)```/,
  )?.[1];
  assert.ok(module, "prolog-proofs.md ships no kibi_certificate module");
  return module;
}

/** A Prolog project: the tree-sitter plugin reads its predicates as symbols. */
async function installTreeSitter(
  sandbox: TestSandbox,
  tarballs: Tarballs,
): Promise<void> {
  const install = await run(
    "npm",
    [
      "install",
      "--prefix",
      sandbox.repoDir,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-save",
      "--package-lock=false",
      `file:${tarballs["plugin-sdk"]}`,
      `file:${tarballs["plugin-treesitter"]}`,
    ],
    { cwd: sandbox.repoDir, env: sandbox.env, timeoutMs: 240000 },
  );
  assert.strictEqual(install.exitCode, 0, install.stdout + install.stderr);
  const { version } = JSON.parse(
    readFileSync(
      join(
        sandbox.repoDir,
        "node_modules",
        "kibi-plugin-treesitter",
        "package.json",
      ),
      "utf8",
    ),
  ) as { version: string };
  writeFileSync(
    join(sandbox.repoDir, "package.json"),
    `${JSON.stringify(
      {
        name: "prolog-code-proofs",
        private: true,
        dependencies: { "kibi-plugin-treesitter": version },
        kibi: {
          plugins: [
            {
              package: "kibi-plugin-treesitter",
              capabilities: { "kibi.symbol-extractor.v2": { mode: "augment" } },
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
}

async function provision(
  sandbox: TestSandbox,
  tarballs: Tarballs,
): Promise<Record<string, string>> {
  await installTreeSitter(sandbox, tarballs);
  await upsert(sandbox, {
    type: "scenario",
    id: "SCEN-MUTATION",
    properties: { title: "Mutate a Prolog library", status: "active" },
  });
  const claims = {
    operators: await applyPlan(
      sandbox,
      await advisorPlan(sandbox, "REQ-OPERATORS", OPERATORS_STATEMENT, "set"),
    ),
    count: await applyPlan(
      sandbox,
      await advisorPlan(sandbox, "REQ-OPERATOR-COUNT", COUNT_STATEMENT, "int"),
    ),
    machine: await applyPlan(
      sandbox,
      await advisorPlan(sandbox, "REQ-RUN-STATES", MACHINE_STATEMENT, "set"),
    ),
    detected: "",
    detectedPredicate: "",
  };
  const detectedPlan = await advisorPlan(
    sandbox,
    "REQ-DETECTED",
    DETECTED_STATEMENT,
    "set",
  );
  const setFact = detectedPlan.find(
    (step) => step.type === "fact" && step.properties.value_type === "set",
  );
  assert.strictEqual(setFact?.properties.operator, "includes");
  claims.detectedPredicate = String(setFact?.properties.property_key);
  claims.detected = await applyPlan(sandbox, detectedPlan);

  const files: Record<string, string> = {
    "pack.pl": "name(mutation_demo).\nversion('0.1.0').\n",
    "prolog/operators.pl": OPERATORS_MODULE,
    "test/kibi_certificate.pl": certificateModule(sandbox),
    "test/proofs.pl": proofSource(claims.detectedPredicate),
  };
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(sandbox.repoDir, file, ".."), { recursive: true });
    writeFileSync(join(sandbox.repoDir, file), content);
    stageSourceFile(sandbox, file);
  }

  const exhaustive = (symbol: string) =>
    `  kind: exhaustive\n  domain_source:\n    symbol_id: ${symbol}\n    arg: 1\n`;
  const detected = (symbol: string) => `  kind: rule
  predicate_source:
    ${claims.detectedPredicate}:
      symbol_id: ${symbol}
  domains:
    status:
      symbol_id: SYM-STATUS
`;
  const machine = (symbol: string) =>
    `  kind: state_machine\n  domain_source:\n    symbol_id: ${symbol}\n  initial_source:\n    symbol_id: SYM-INITIAL\n`;
  const tests: [string, string, string, string][] = [
    [
      "TEST-OPERATORS",
      "REQ-OPERATORS",
      exhaustive("SYM-OPERATOR"),
      claims.operators,
    ],
    [
      "TEST-OPERATORS-LEGACY",
      "REQ-OPERATORS",
      exhaustive("SYM-LEGACY-OPERATOR").replace("    arg: 1\n", ""),
      claims.operators,
    ],
    [
      "TEST-OPERATOR-COUNT",
      "REQ-OPERATOR-COUNT",
      "  kind: arithmetic\n  value_source:\n    - symbol_id: SYM-OPERATOR\n      arg: 1\n      measure: count\n",
      claims.count,
    ],
    [
      "TEST-DETECTED",
      "REQ-DETECTED",
      detected("SYM-DETECTED"),
      claims.detected,
    ],
    [
      "TEST-DETECTED-LENIENT",
      "REQ-DETECTED",
      detected("SYM-LENIENT-DETECTED"),
      claims.detected,
    ],
    [
      "TEST-RUN-MACHINE",
      "REQ-RUN-STATES",
      machine("SYM-TRANSITION"),
      claims.machine,
    ],
    [
      "TEST-RUN-MACHINE-LOOSE",
      "REQ-RUN-STATES",
      machine("SYM-LOOSE-TRANSITION"),
      claims.machine,
    ],
  ];
  for (const [id, , contract, claim] of tests) {
    const relative = `.kb/tests/${id}.md`;
    writeFileSync(
      join(sandbox.repoDir, relative),
      testDocument(id, contract, claim),
    );
    stageSourceFile(sandbox, relative);
  }
  const synced = await kibi(sandbox, ["sync"]);
  assert.strictEqual(synced.exitCode, 0, synced.stdout + synced.stderr);
  for (const [id] of tests)
    await upsert(sandbox, {
      type: "test",
      id,
      properties: { title: `Prolog proof ${id}`, status: "passing" },
      relationships: [{ type: "validates", from: id, to: "SCEN-MUTATION" }],
    });

  // Each model symbol is a predicate of the Prolog module, titled by its
  // indicator; it implements its requirement and is covered by the tests
  // that read it. The proof file is the tests' executable code.
  const symbols: [string, string, string, string, string[]][] = [
    [
      "SYM-OPERATOR",
      "operator/2",
      "prolog/operators.pl",
      "REQ-OPERATORS",
      ["TEST-OPERATORS", "TEST-OPERATOR-COUNT"],
    ],
    [
      "SYM-LEGACY-OPERATOR",
      "legacy_operator/1",
      "prolog/operators.pl",
      "REQ-OPERATORS",
      ["TEST-OPERATORS-LEGACY"],
    ],
    [
      "SYM-STATUS",
      "status/1",
      "prolog/operators.pl",
      "REQ-DETECTED",
      ["TEST-DETECTED", "TEST-DETECTED-LENIENT"],
    ],
    [
      "SYM-DETECTED",
      "detected/1",
      "prolog/operators.pl",
      "REQ-DETECTED",
      ["TEST-DETECTED"],
    ],
    [
      "SYM-LENIENT-DETECTED",
      "lenient_detected/1",
      "prolog/operators.pl",
      "REQ-DETECTED",
      ["TEST-DETECTED-LENIENT"],
    ],
    [
      "SYM-TRANSITION",
      "transition/3",
      "prolog/operators.pl",
      "REQ-RUN-STATES",
      ["TEST-RUN-MACHINE"],
    ],
    [
      "SYM-LOOSE-TRANSITION",
      "loose_transition/3",
      "prolog/operators.pl",
      "REQ-RUN-STATES",
      ["TEST-RUN-MACHINE-LOOSE"],
    ],
    [
      "SYM-INITIAL",
      "initial/1",
      "prolog/operators.pl",
      "REQ-RUN-STATES",
      ["TEST-RUN-MACHINE", "TEST-RUN-MACHINE-LOOSE"],
    ],
    ["SYM-PROOFS", "main/0", "test/proofs.pl", "", []],
  ];
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
        ...(id === "SYM-PROOFS"
          ? tests.map(([test]) => ({
              type: "executable_for",
              from: id,
              to: test,
            }))
          : []),
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
          command: ["swipl", "test/proofs.pl"],
          artifact: ".kb/proof/runs/command.json",
          targets: ["default"],
          description: "Runs the Prolog proofs, which leave certificates.",
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
 * Provisions the Prolog project, runs kibi prove --all, and checks how each
 * certificate over the Prolog code binds to the claim it names.
 */
export async function checkPrologCodeProofs(
  sandbox: TestSandbox,
  tarballs: Tarballs,
): Promise<void> {
  const claims = await provision(sandbox, tarballs);
  const prove = await kibi(sandbox, ["prove", "--all"], { timeoutMs: 240000 });
  assert.strictEqual(prove.exitCode, 0, prove.stdout + prove.stderr);

  const operators = latestReceipt(sandbox, "TEST-OPERATORS");
  assert.match(operators, /evidence_level: proved/, operators);
  assert.match(operators, /binding: derived/, operators);
  assert.match(
    prove.stderr,
    new RegExp(
      `TEST-OPERATORS ${claims.operators} \\(REQ-OPERATORS\\): derived, code scope`,
    ),
    prove.stderr,
  );
  // legacy_operator/1 lists negate only: the set fact names swap_args too.
  const legacy = latestReceipt(sandbox, "TEST-OPERATORS-LEGACY");
  assert.match(legacy, /binding: rejected/, legacy);
  assert.match(legacy, /swap_args/, legacy);

  const count = latestReceipt(sandbox, "TEST-OPERATOR-COUNT");
  assert.match(count, /evidence_level: proved/, count);
  assert.match(count, /binding: derived/, count);

  const detected = latestReceipt(sandbox, "TEST-DETECTED");
  assert.match(detected, /evidence_level: proved/, detected);
  assert.match(detected, /binding: derived/, detected);
  const lenient = latestReceipt(sandbox, "TEST-DETECTED-LENIENT");
  assert.match(lenient, /evidence_level: proved/, lenient);
  // includes: survived also counting as detected does not break "every
  // status in killed and timeout"; the receipt still derives the claim.
  assert.match(lenient, /binding: derived/, lenient);

  const machine = latestReceipt(sandbox, "TEST-RUN-MACHINE");
  assert.match(machine, /evidence_level: proved/, machine);
  assert.match(machine, /binding: derived/, machine);
  const loose = latestReceipt(sandbox, "TEST-RUN-MACHINE-LOOSE");
  assert.match(loose, /binding: rejected/, loose);
  assert.match(loose, /failed->pending/, loose);

  const explain = await kibi(sandbox, ["proof", "explain", "REQ-RUN-STATES"]);
  assert.strictEqual(explain.exitCode, 0, explain.stdout + explain.stderr);
  assert.match(explain.stdout, /Claims \(1\/1 proved/, explain.stdout);
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: SWI-Prolog code proofs", () => {
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
      "proves operator sets, counts, rules and state machines from Prolog facts",
      { timeout: 300000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await checkPrologCodeProofs(sandbox, tarballs);
      },
    );
  });
}
