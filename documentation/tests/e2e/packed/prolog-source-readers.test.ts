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
 * E2E: source proofs read SWI-Prolog code and pack metadata without running
 * them.
 *
 * SCEN-kibi-prolog-source-readers — a SWI-Prolog pack states which packs it
 * may require, which libraries its operators module may load, which
 * environment variables it may read and that it never loads a foreign
 * library. Source tests read pack.pl's requires/1 facts with the prolog
 * reader and the module's imports, environment reads and calls with the
 * references reader; each claim gets a derived binding at evidence level
 * proved. A module that calls a goal held in a variable is refused with the
 * place, so the never-call claim is not decided over calls Kibi only partly
 * saw, and once pack.pl requires another pack the requires claim is
 * rejected with that pack.
 */

type Step = Readonly<{
  type: string;
  id: string;
  properties: Record<string, unknown>;
  relationships?: readonly Record<string, string>[];
}>;

const STATEMENTS = {
  requires:
    "Every pack the pack requires must be one of lists_more or clpfd_extra.",
  imports:
    "Every library the operators module imports must be one of library(lists) or library(apply).",
  env: "Every environment variable the library reads must be one of KIBI_MODE or HOME.",
  foreign: "The operators library must never call use_foreign_library/1.",
} as const;

const EXPECTED_FACTS: Record<keyof typeof STATEMENTS, [string, string]> = {
  requires: ["allowed_values", "subset_of"],
  imports: ["allowed_values", "subset_of"],
  env: ["allowed_values", "subset_of"],
  foreign: ["calls", "excludes"],
};

const PACK = `name(operators).
version('0.1.0').
title('Mutation operators').
requires(lists_more).
author('A Maintainer', 'maintainer@example.org').
`;

const OPERATORS = `:- module(operators, [operator/2, apply_operator/3]).
:- use_module(library(lists)).
:- use_module(library(apply)).

operator(negate, "Negate a goal").
operator(swap_args, "Swap two arguments").

apply_operator(negate, Goal, \\+ Goal).
apply_operator(swap_args, Goal, Swapped) :-
    Goal =.. [Name, A, B],
    Swapped =.. [Name, B, A].

verbose :- getenv('KIBI_MODE', verbose).

names(Names) :- findall(N, operator(N, _), All), list_to_set(All, Names).
`;

const PLUGINS = `:- module(plugins, [run_plugin/1]).
run_plugin(Goal) :- call(Goal).
`;

async function upsert(sandbox: TestSandbox, payload: unknown): Promise<void> {
  const request = join(sandbox.repoDir, "upsert-request.json");
  writeFileSync(request, JSON.stringify(payload));
  const result = await kibi(sandbox, ["upsert", "--input", request]);
  assert.strictEqual(result.exitCode, 0, result.stdout + result.stderr);
}

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
          ? [{ type: "specified_by", from: step.id, to: "SCEN-PACK" }]
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
title: Prolog source proof ${id}
status: passing
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: command
  required_proofs:
    - symbol_id: SYM-PROOFS
      target: default
  success_policy: all_required_first_attempt
  kind: source
${contract}  proves:
    - ${claim}
type: test
---

Proves a claim about the Prolog pack with a source proof for kibi prove.
`;
}

async function provision(
  sandbox: TestSandbox,
): Promise<Record<string, string>> {
  const files: Record<string, string> = {
    "pack.pl": PACK,
    "prolog/operators.pl": OPERATORS,
    "prolog/plugins.pl": PLUGINS,
    "proofs.mjs":
      "// Source proofs need no certificate: Kibi reads the sources itself.\n",
  };
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(sandbox.repoDir, file, ".."), { recursive: true });
    writeFileSync(join(sandbox.repoDir, file), content);
    stageSourceFile(sandbox, file);
  }
  await upsert(sandbox, {
    type: "scenario",
    id: "SCEN-PACK",
    properties: { title: "Publish a Prolog pack", status: "active" },
  });
  const claims: Record<string, string> = {};
  for (const key of Object.keys(STATEMENTS) as (keyof typeof STATEMENTS)[]) {
    const plan = await advisorPlan(
      sandbox,
      `REQ-${key.toUpperCase()}`,
      STATEMENTS[key],
    );
    const setFact = plan.find(
      (step) => step.type === "fact" && step.properties.value_type === "set",
    );
    assert.deepStrictEqual(
      [setFact?.properties.property_key, setFact?.properties.operator],
      EXPECTED_FACTS[key],
      JSON.stringify(plan),
    );
    claims[key] = await applyPlan(sandbox, plan);
  }
  const references = (files: string, extract: string) =>
    `  source:\n    reader: references\n    files: ${files}\n    extract: ${extract}\n`;
  const tests: [string, string, string][] = [
    [
      "TEST-PACK-REQUIRES",
      "  source:\n    reader: prolog\n    file: pack.pl\n    functor: requires/1\n",
      claims.requires ?? "",
    ],
    [
      "TEST-OPERATOR-IMPORTS",
      references("prolog/operators.pl", "imports"),
      claims.imports ?? "",
    ],
    [
      "TEST-OPERATOR-ENV",
      references("prolog/operators.pl", "env"),
      claims.env ?? "",
    ],
    [
      "TEST-OPERATOR-FOREIGN",
      references("prolog/operators.pl", "calls"),
      claims.foreign ?? "",
    ],
    [
      "TEST-LIBRARY-FOREIGN",
      references("prolog/*.pl", "calls"),
      claims.foreign ?? "",
    ],
  ];
  for (const [id, contract, claim] of tests) {
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
      properties: { title: `Prolog source proof ${id}`, status: "passing" },
      relationships: [{ type: "validates", from: id, to: "SCEN-PACK" }],
    });
  await upsert(sandbox, {
    type: "symbol",
    id: "SYM-PROOFS",
    properties: {
      title: "proofs",
      status: "active",
      sourceFile: "proofs.mjs",
      symbol_role: "behavioral",
    },
    relationships: tests.map(([id]) => ({
      type: "executable_for",
      from: "SYM-PROOFS",
      to: id,
    })),
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
          command: ["node", "proofs.mjs"],
          artifact: ".kb/proof/runs/command.json",
          targets: ["default"],
          description: "Source proofs need no certificate.",
        },
      ],
    }),
  );
  const sync = await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"]);
  assert.strictEqual(sync.exitCode, 0, sync.stdout + sync.stderr);
  return claims;
}

function latestReceipt(sandbox: TestSandbox, testId: string): string {
  const document = readFileSync(
    join(sandbox.repoDir, ".kb", "tests", `${testId}.md`),
    "utf8",
  );
  const frontmatter = document.split(/^---$/m)[1] ?? "";
  return frontmatter.split(/^ {2}- version: /m).at(-1) ?? "";
}

/**
 * Provisions the Prolog pack, runs kibi prove --all, and checks how each
 * source proof over its Prolog sources binds to the claim it names.
 */
export async function checkPrologSourceReaders(
  sandbox: TestSandbox,
): Promise<void> {
  await provision(sandbox);
  const prove = await kibi(sandbox, ["prove", "--all"], { timeoutMs: 240000 });
  assert.strictEqual(prove.exitCode, 0, prove.stdout + prove.stderr);

  for (const testId of [
    "TEST-PACK-REQUIRES",
    "TEST-OPERATOR-IMPORTS",
    "TEST-OPERATOR-ENV",
    "TEST-OPERATOR-FOREIGN",
  ]) {
    const receipt = latestReceipt(sandbox, testId);
    assert.match(
      receipt,
      /evidence_level: proved/,
      `${testId}\n${receipt}\n${prove.stderr}`,
    );
    assert.match(receipt, /binding: derived/, receipt);
  }
  // Kibi stores its own read as the certificate.
  assert.match(
    latestReceipt(sandbox, "TEST-OPERATOR-IMPORTS"),
    /- library\(apply\)/,
  );
  // plugins.pl calls a goal held in a variable: the calls of the library are
  // not known exactly, so the never-call claim is not decided.
  const library = latestReceipt(sandbox, "TEST-LIBRARY-FOREIGN");
  assert.match(library, /binding: rejected/, library);
  assert.match(library, /prolog\/plugins\.pl:2 call\(Goal\)/, library);
  assert.doesNotMatch(library, /evidence_level: proved/, library);

  // The pack now requires a pack its requirement does not allow.
  writeFileSync(
    join(sandbox.repoDir, "pack.pl"),
    `${PACK}requires(tabling_plus).\n`,
  );
  stageSourceFile(sandbox, "pack.pl");
  const reprove = await kibi(
    sandbox,
    ["prove", "--test", "TEST-PACK-REQUIRES"],
    { timeoutMs: 240000 },
  );
  assert.strictEqual(reprove.exitCode, 0, reprove.stdout + reprove.stderr);
  const requires = latestReceipt(sandbox, "TEST-PACK-REQUIRES");
  assert.match(requires, /binding: rejected/, requires);
  assert.match(requires, /tabling_plus/, requires);
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: SWI-Prolog source readers", () => {
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
      "proves pack, import, environment and call claims against what Kibi reads from Prolog sources",
      { timeout: 300000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await checkPrologSourceReaders(sandbox);
      },
    );
  });
}
