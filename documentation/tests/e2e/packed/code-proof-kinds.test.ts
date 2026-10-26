import assert from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
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
 * E2E: certificate proof kinds earn proved receipts only when Kibi re-checks
 * their certificates.
 *
 * SCEN-kibi-code-proof-kinds — `kibi prove` runs a command integration whose
 * tests leave kibi.code-certificate.v1 files in KIBI_PROOF_CERTIFICATES. An
 * exhaustive proof that imports its domain, an arithmetic claim the
 * assumptions entail, an SMT query the solver answers unsat and a typecheck
 * witness Kibi compiles get kibi.proof-receipt.v2 entries at evidence level
 * proved; the arithmetic and SMT assumptions are the knowledge base's typed
 * facts. A hand-listed or partial domain, a claim the assumptions do not
 * entail, assumptions the test chose instead of the facts and a runner-kind
 * test stay tested, each rejection saying why.
 */

const Z3_AVAILABLE =
  spawnSync("z3", ["--version"], { encoding: "utf8" }).status === 0;

type Receipt = Readonly<{
  version: string;
  kind: string | undefined;
  evidence_level: string | undefined;
  certificate_rejection: string | undefined;
  certificate_digest: string | undefined;
}>;

/** The knowledge base's bounds on retry_count, which ground the arithmetic and SMT proofs. */
const RETRY_FACTS =
  "  constraint_source:\n    fact_ids:\n      - FACT-RETRY-MIN\n      - FACT-RETRY-MAX\n";

const FACTS: Record<string, string> = {
  "FACT-RETRY-MIN": "operator: gte\nvalue_type: int\nvalue_int: 0",
  "FACT-RETRY-MAX": "operator: lt\nvalue_type: int\nvalue_int: 4",
};

const KIND_TESTS: readonly Readonly<{
  id: string;
  kind: string;
  proofSymbol: string;
  extra?: string;
}>[] = [
  {
    id: "TEST-KIND-EXHAUSTIVE",
    kind: "exhaustive",
    proofSymbol: "SYM-PROOF-EXHAUSTIVE",
    extra: "  domain_source:\n    symbol_id: SYM-COLORS\n",
  },
  {
    id: "TEST-KIND-HANDLISTED",
    kind: "exhaustive",
    proofSymbol: "SYM-PROOF-HANDLISTED",
    extra: "  domain_source:\n    symbol_id: SYM-COLORS\n",
  },
  {
    id: "TEST-KIND-TYPECHECK",
    kind: "typecheck",
    proofSymbol: "SYM-PROOF-TYPECHECK",
    extra:
      "  domain_source:\n    symbol_id: SYM-COLORS\n  witness:\n    path: witness.ts\n",
  },
  {
    id: "TEST-KIND-ARITHMETIC",
    kind: "arithmetic",
    proofSymbol: "SYM-PROOF-ARITHMETIC",
    extra: RETRY_FACTS,
  },
  {
    id: "TEST-KIND-ARITHMETIC-WRONG",
    kind: "arithmetic",
    proofSymbol: "SYM-PROOF-ARITHMETIC",
    extra: RETRY_FACTS,
  },
  {
    id: "TEST-KIND-ARITHMETIC-UNGROUNDED",
    kind: "arithmetic",
    proofSymbol: "SYM-PROOF-ARITHMETIC",
    extra: RETRY_FACTS,
  },
  {
    id: "TEST-KIND-PARTIAL",
    kind: "exhaustive",
    proofSymbol: "SYM-PROOF-PARTIAL",
    extra: "  domain_source:\n    symbol_id: SYM-COLORS\n",
  },
  {
    id: "TEST-KIND-UNICODE",
    kind: "exhaustive",
    proofSymbol: "SYM-PROOF-UNICODE",
    extra: "  domain_source:\n    symbol_id: SYM-NAMES\n",
  },
  {
    id: "TEST-KIND-SMT",
    kind: "smt",
    proofSymbol: "SYM-PROOF-SMT",
    extra: RETRY_FACTS,
  },
  { id: "TEST-KIND-E2E", kind: "e2e", proofSymbol: "SYM-PROOF-ARITHMETIC" },
];

const SOURCES: Record<string, string> = {
  "colors.mjs":
    '/** @type {readonly ["red", "green", "blue"]} */\nexport const COLORS = ["red", "green", "blue"];\n',
  "exhaustive.mjs": `import { COLORS } from "./colors.mjs";
import { emit } from "./emit.mjs";
emit("TEST-KIND-EXHAUSTIVE", {
  kind: "exhaustive",
  domain: { symbol_id: "SYM-COLORS", members: COLORS },
  results: COLORS.map((member) => ({ member, outcome: "passed" })),
});
`,
  // Imports the domain but checks only part of it.
  "partial.mjs": `import { COLORS } from "./colors.mjs";
import { emit } from "./emit.mjs";
const members = COLORS.slice(0, 2);
emit("TEST-KIND-PARTIAL", {
  kind: "exhaustive",
  domain: { symbol_id: "SYM-COLORS", members },
  results: members.map((member) => ({ member, outcome: "passed" })),
});
`,
  // Non-ASCII members, hashed alike by the CLI and code_certificates.pl.
  "names.mjs": 'export const NAMES = ["café", "日本", "😀"];\n',
  "unicode.mjs": `import { NAMES } from "./names.mjs";
import { emit } from "./emit.mjs";
emit("TEST-KIND-UNICODE", {
  kind: "exhaustive",
  domain: { symbol_id: "SYM-NAMES", members: NAMES },
  results: NAMES.map((member) => ({ member, outcome: "passed" })),
});
`,
  // Restates the domain instead of importing it.
  "handlisted.mjs": `import { emit } from "./emit.mjs";
const members = ["red", "green", "blue"];
emit("TEST-KIND-HANDLISTED", {
  kind: "exhaustive",
  domain: { symbol_id: "SYM-COLORS", members },
  results: members.map((member) => ({ member, outcome: "passed" })),
});
`,
  "witness.ts": `import { COLORS } from "./colors.mjs";
type Color = (typeof COLORS)[number];
export function hex(color: Color): string {
  switch (color) {
    case "red": return "#f00";
    case "green": return "#0f0";
    case "blue": return "#00f";
    default: { const unhandled: never = color; return unhandled; }
  }
}
`,
  "typecheck.mjs": `import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { emit } from "./emit.mjs";
emit("TEST-KIND-TYPECHECK", {
  kind: "typecheck",
  domain: { symbol_id: "SYM-COLORS" },
  witness: { path: "witness.ts", sha256: createHash("sha256").update(readFileSync("witness.ts", "utf8")).digest("hex") },
  compiler: { name: "tsc", version: "5.9.3" },
  outcome: "passed",
});
`,
  "arithmetic.mjs": `import { emit } from "./emit.mjs";
const certificate = (claim) => ({
  kind: "arithmetic",
  variable: "retry_count",
  value_type: "int",
  assumptions: [{ operator: "gte", value: 0 }, { operator: "lt", value: 4 }],
  claim,
});
emit("TEST-KIND-ARITHMETIC", certificate({ operator: "lte", value: 3 }));
emit("TEST-KIND-ARITHMETIC-WRONG", certificate({ operator: "lte", value: 2 }));
// Narrower assumptions than the facts state, chosen by the test.
emit("TEST-KIND-ARITHMETIC-UNGROUNDED", {
  ...certificate({ operator: "lte", value: 3 }),
  assumptions: [{ operator: "gte", value: 0 }, { operator: "lt", value: 3 }],
});
`,
  "smt.mjs": `import { emit } from "./emit.mjs";
emit("TEST-KIND-SMT", {
  kind: "smt",
  solver: { name: "z3", version: "4" },
  query: "(declare-const retry_count Int)(assert (>= retry_count 0))(assert (< retry_count 4))(assert (not (<= retry_count 3)))(check-sat)",
  result: "unsat",
});
`,
  "emit.mjs": `import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const selected = new Set(JSON.parse(process.env.KIBI_PROOF_TEST_IDS ?? "[]"));
export function emit(testId, fields) {
  const directory = process.env.KIBI_PROOF_CERTIFICATES;
  if (!directory || !selected.has(testId)) return;
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, testId + ".json"), JSON.stringify({ version: "kibi.code-certificate.v1", test_id: testId, ...fields }));
}
`,
  "run-proofs.mjs": `await import("./exhaustive.mjs");
await import("./handlisted.mjs");
await import("./partial.mjs");
await import("./unicode.mjs");
await import("./typecheck.mjs");
await import("./arithmetic.mjs");
await import("./smt.mjs");
`,
};

const SYMBOLS: readonly [string, string, string][] = [
  ["SYM-COLORS", "COLORS", "colors.mjs"],
  ["SYM-PROOF-EXHAUSTIVE", "exhaustive proof", "exhaustive.mjs"],
  ["SYM-PROOF-HANDLISTED", "hand-listed proof", "handlisted.mjs"],
  ["SYM-PROOF-PARTIAL", "partial proof", "partial.mjs"],
  ["SYM-NAMES", "NAMES", "names.mjs"],
  ["SYM-PROOF-UNICODE", "unicode proof", "unicode.mjs"],
  ["SYM-PROOF-TYPECHECK", "typecheck proof", "typecheck.mjs"],
  ["SYM-PROOF-ARITHMETIC", "arithmetic proof", "arithmetic.mjs"],
  ["SYM-PROOF-SMT", "smt proof", "smt.mjs"],
];

async function provision(sandbox: TestSandbox): Promise<void> {
  for (const [file, content] of Object.entries(SOURCES)) {
    writeFileSync(join(sandbox.repoDir, file), content);
    stageSourceFile(sandbox, file);
  }
  // Kibi compiles the typecheck witness with the workspace's TypeScript.
  const repoRoot = process.env.KIBI_PROOF_REPO_ROOT?.trim() || process.cwd();
  const typescript = dirname(
    createRequire(join(repoRoot, "package.json")).resolve(
      "typescript/package.json",
    ),
  );
  mkdirSync(join(sandbox.repoDir, "node_modules"), { recursive: true });
  symlinkSync(typescript, join(sandbox.repoDir, "node_modules", "typescript"));
  for (const [id, fields] of Object.entries(FACTS)) {
    const relative = `.kb/facts/${id}.md`;
    writeFileSync(
      join(sandbox.repoDir, relative),
      `---\nid: ${id}\ntitle: Retry count bound\nstatus: active\ntype: fact\nfact_kind: property_value\nsubject_key: packed.retries\nproperty_key: retry_count\n${fields}\n---\n\nA bound on retry_count.\n`,
    );
    stageSourceFile(sandbox, relative);
  }
  writeFileSync(
    join(sandbox.repoDir, ".kb/requirements/REQ-PACKED-KINDS.md"),
    "---\nid: REQ-PACKED-KINDS\ntype: req\ntitle: Packed proof kinds\nstatus: open\n---\n\nColors render for every member.\n",
  );
  stageSourceFile(sandbox, ".kb/requirements/REQ-PACKED-KINDS.md");
  const synced = await kibi(sandbox, ["sync"]);
  assert.strictEqual(synced.exitCode, 0, synced.stdout + synced.stderr);
  for (const [id, title, sourceFile] of SYMBOLS) {
    const request = join(sandbox.repoDir, `${id}.json`);
    writeFileSync(
      request,
      JSON.stringify({
        type: "symbol",
        id,
        properties: {
          title,
          status: "active",
          sourceFile,
          symbol_role: "behavioral",
        },
        relationships: [
          { from: id, to: "REQ-PACKED-KINDS", type: "implements" },
        ],
      }),
    );
    const upsert = await kibi(sandbox, ["upsert", "--input", request]);
    assert.strictEqual(upsert.exitCode, 0, upsert.stdout + upsert.stderr);
  }
  for (const test of KIND_TESTS) {
    const relative = `.kb/tests/${test.id}.md`;
    writeFileSync(
      join(sandbox.repoDir, relative),
      `---
id: ${test.id}
title: ${test.kind} proof ${test.id}
status: passing
source: ${relative}
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: command
  required_proofs:
    - symbol_id: ${test.proofSymbol}
      target: default
  success_policy: all_required_first_attempt
  kind: ${test.kind}
${test.extra ?? ""}type: test
---

Leaves a ${test.kind} certificate for kibi prove.
`,
    );
    stageSourceFile(sandbox, relative);
  }
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
          description: "Runs the sandbox proofs, which leave certificates.",
        },
      ],
    }),
  );
  const sync = await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"]);
  assert.strictEqual(sync.exitCode, 0, sync.stdout + sync.stderr);
}

/**
 * The last receipt in the test document's proof_receipts, read field by
 * field from the YAML Kibi wrote (top-level receipt keys sit at four spaces).
 */
function latestReceipt(sandbox: TestSandbox, testId: string): Receipt {
  const document = readFileSync(
    join(sandbox.repoDir, ".kb", "tests", `${testId}.md`),
    "utf8",
  );
  const frontmatter = document.split(/^---$/m)[1] ?? "";
  const blocks = frontmatter.split(/^ {2}- version: /m);
  assert.ok(blocks.length > 1, `${testId} has no receipt:\n${document}`);
  const block = `version: ${blocks.at(-1)}`;
  const field = (name: string): string | undefined => {
    const match = block.match(
      new RegExp(`^(?: {4})?${name}: (.*(?:\\n {6,}.*)*)`, "m"),
    );
    if (!match?.[1]) return undefined;
    const value = match[1].replace(/\n\s+/g, " ").trim();
    return value.replace(/^(['"])([\s\S]*)\1$/, "$2").replaceAll("''", "'");
  };
  return {
    version: field("version") ?? "",
    kind: field("kind"),
    evidence_level: field("evidence_level"),
    certificate_rejection: field("certificate_rejection"),
    certificate_digest: field("certificate_digest"),
  };
}

/**
 * Provisions the proof-kind fixture, runs kibi prove --all, and checks each
 * test's latest receipt: re-checked certificates earn proved, the rest stay
 * tested with the reason.
 */
export async function checkCodeProofKinds(sandbox: TestSandbox): Promise<void> {
  await provision(sandbox);
  const prove = await kibi(sandbox, ["prove", "--all"], {
    timeoutMs: 240000,
  });
  assert.strictEqual(prove.exitCode, 0, prove.stdout + prove.stderr);

  for (const id of [
    "TEST-KIND-EXHAUSTIVE",
    "TEST-KIND-UNICODE",
    "TEST-KIND-TYPECHECK",
    "TEST-KIND-ARITHMETIC",
    ...(Z3_AVAILABLE ? ["TEST-KIND-SMT"] : []),
  ]) {
    const receipt = latestReceipt(sandbox, id);
    assert.strictEqual(receipt.version, "kibi.proof-receipt.v2", id);
    assert.strictEqual(
      receipt.evidence_level,
      "proved",
      `${id}: ${receipt.certificate_rejection}`,
    );
    assert.match(receipt.certificate_digest ?? "", /^[0-9a-f]{64}$/);
  }

  const handListed = latestReceipt(sandbox, "TEST-KIND-HANDLISTED");
  assert.strictEqual(handListed.evidence_level, "tested");
  assert.match(
    handListed.certificate_rejection ?? "",
    /does not import COLORS from colors\.mjs/,
  );
  const partial = latestReceipt(sandbox, "TEST-KIND-PARTIAL");
  assert.strictEqual(partial.evidence_level, "tested");
  assert.match(
    partial.certificate_rejection ?? "",
    /does not cover COLORS as the code defines it \(missing blue\)/,
  );
  const ungrounded = latestReceipt(sandbox, "TEST-KIND-ARITHMETIC-UNGROUNDED");
  assert.strictEqual(ungrounded.evidence_level, "tested");
  assert.match(
    ungrounded.certificate_rejection ?? "",
    /not exactly the constraint_source facts' constraints/,
  );
  const wrong = latestReceipt(sandbox, "TEST-KIND-ARITHMETIC-WRONG");
  assert.strictEqual(wrong.evidence_level, "tested");
  assert.match(wrong.certificate_rejection ?? "", /do not entail the claim/);
  const runner = latestReceipt(sandbox, "TEST-KIND-E2E");
  assert.strictEqual(runner.kind, "e2e");
  assert.strictEqual(runner.evidence_level, "tested");
  assert.strictEqual(runner.certificate_rejection, undefined);
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: code proof kinds", () => {
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
      "proves certificate kinds whose certificates re-check and keeps the rest at tested",
      { timeout: 300000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await checkCodeProofKinds(sandbox);
      },
    );
  });
}
