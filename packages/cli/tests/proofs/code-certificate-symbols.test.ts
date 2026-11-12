import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  checkCodeCertificate,
  evaluateDomain,
  valueSourceValues,
} from "../../src/operations/proof/code-certificates.js";
import {
  evaluateMachine,
  evaluatePattern,
} from "../../src/operations/proof/code-models.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import { certificateDigest } from "../../src/public/proof-certificates.js";
import type { ProofContract } from "../../src/public/proof-protocol.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-code-certificates-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    writeFileSync(path.join(root, relative), content);
  }
  return root;
}

type Symbol = Readonly<{ title: string; sourceFile: string }>;

/**
 * A Prolog port that answers symbol lookups from a table and accepts every
 * certificate re-check with the digest the CLI computes.
 */
function context(
  root: string,
  symbols: Record<string, Symbol>,
): OperationContext {
  const prolog = {
    oneShotMode: true,
    async query(goal: string) {
      const check = /code_certificate_check_json\('((?:[^'\\]|\\.|'')*)'/.exec(
        goal,
      );
      if (check) {
        const json = (check[1] ?? "")
          .replaceAll("''", "'")
          .replaceAll("\\\\", "\\");
        const digest = certificateDigest(
          JSON.parse(json) as Record<string, unknown>,
        );
        return {
          success: true,
          bindings: { JsonString: JSON.stringify({ accepted: true, digest }) },
        };
      }
      const lookup = /kb_entity\('([^']+)', 'symbol'/.exec(goal);
      const symbol = lookup ? symbols[lookup[1] ?? ""] : undefined;
      if (!lookup || symbol === undefined)
        return { success: true, bindings: { Results: "[]" } };
      return {
        success: true,
        bindings: {
          Results: `[['${lookup[1]}',symbol,[title="${symbol.title}",sourceFile="${symbol.sourceFile}"]]]`,
        },
      };
    },
  };
  return { workspaceRoot: root, prolog } as unknown as OperationContext;
}

const OPERATORS = `:- module(operators, [operator/2, hard_limit/1]).
operator(negate, "Negate a goal").
operator(swap_args, "Swap two arguments").
hard_limit(10).
`;

function contract(overrides: Partial<ProofContract>): ProofContract {
  return {
    version: "kibi.proof-contract.v1",
    integration: "self-proof",
    required_proofs: [{ symbol_id: "SYM-PROOF", target: "default" }],
    success_policy: "all_required_first_attempt",
    ...overrides,
  } as ProofContract;
}

describe("a domain in a file of no known language", () => {
  test("is refused", () => {
    const root = workspace({ "src/limits.rb": "LIMIT = 3\n" });
    const read = evaluateDomain(root, "src/limits.rb", "LIMIT");
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.reason).toContain("src/limits.rb");
  });
});

describe("value_source symbols", () => {
  test("count a predicate's projected argument and read a constant", async () => {
    const root = workspace({ "prolog/operators.pl": OPERATORS });
    const ctx = context(root, {
      "SYM-OPS": { title: "operator/2", sourceFile: "prolog/operators.pl" },
      "SYM-LIMIT": { title: "hard_limit/1", sourceFile: "prolog/operators.pl" },
    });
    const values = await valueSourceValues(
      ctx,
      contract({
        kind: "arithmetic",
        value_source: [
          { symbol_id: "SYM-OPS", measure: "count", arg: 1 },
          { symbol_id: "SYM-LIMIT", arg: 1 },
          { symbol_id: "SYM-LIMIT", export: "hard_limit/1" },
        ],
      } as Partial<ProofContract>),
    );
    expect(values).toEqual({
      ok: true,
      values: [
        { symbol_id: "SYM-OPS", value: 2 },
        { symbol_id: "SYM-LIMIT", value: 10 },
        { symbol_id: "SYM-LIMIT", value: 10 },
      ],
    });
  });

  test("count a TypeScript collection without arg", async () => {
    const root = workspace({
      "src/limits.ts":
        "export const KINDS = ['a', 'b', 'c'];\nexport const MAX = 7;\n",
    });
    const ctx = context(root, {
      "SYM-KINDS": { title: "KINDS", sourceFile: "src/limits.ts" },
      "SYM-MAX": { title: "MAX", sourceFile: "src/limits.ts" },
    });
    const values = await valueSourceValues(
      ctx,
      contract({
        kind: "arithmetic",
        value_source: [
          { symbol_id: "SYM-KINDS", measure: "count" },
          { symbol_id: "SYM-MAX" },
        ],
      } as Partial<ProofContract>),
    );
    expect(values).toEqual({
      ok: true,
      values: [
        { symbol_id: "SYM-KINDS", value: 3 },
        { symbol_id: "SYM-MAX", value: 7 },
      ],
    });
  });

  test("refuse a symbol with no source file, a domain or a constant that cannot be read", async () => {
    const root = workspace({ "prolog/operators.pl": OPERATORS });
    const ctx = context(root, {
      "SYM-OPS": { title: "operator/2", sourceFile: "prolog/operators.pl" },
    });
    const run = (row: Record<string, unknown>) =>
      valueSourceValues(
        ctx,
        contract({
          kind: "arithmetic",
          value_source: [row],
        } as unknown as Partial<ProofContract>),
      );
    expect(await run({ symbol_id: "SYM-NONE" })).toEqual({
      ok: false,
      reason: "the value_source symbol SYM-NONE has no source file",
    });
    const domain = await run({ symbol_id: "SYM-OPS", measure: "count" });
    expect(domain.ok).toBe(false);
    if (!domain.ok) expect(domain.reason).toContain("set arg");
    const scalar = await run({ symbol_id: "SYM-OPS", arg: 2 });
    expect(scalar.ok).toBe(false);
  });
});

describe("an exhaustive certificate over a SWI-Prolog domain", () => {
  const files = {
    "prolog/operators.pl": OPERATORS,
    "test/operators.plt":
      ":- use_module('../prolog/operators').\nok :- forall(operator(O, _), atom(O)).\n",
  };
  const symbols = {
    "SYM-DOMAIN": { title: "operator/2", sourceFile: "prolog/operators.pl" },
    "SYM-PROOF": { title: "ok/0", sourceFile: "test/operators.plt" },
  };

  function certificate(members: string[]) {
    return {
      version: "kibi.code-certificate.v1",
      kind: "exhaustive",
      test_id: "TEST-OPS",
      domain: { symbol_id: "SYM-DOMAIN", members },
      results: members.map((member) => ({ member, outcome: "passed" })),
    };
  }

  async function verdict(
    members: string[],
    domainSource: Record<string, unknown>,
  ) {
    const root = workspace(files);
    return checkCodeCertificate(context(root, symbols), {
      testId: "TEST-OPS",
      contract: contract({
        kind: "exhaustive",
        domain_source: domainSource,
      } as Partial<ProofContract>),
      outcome: "passed",
      certificate: certificate(members),
    });
  }

  test("is proved when it checks every member of the projected argument", async () => {
    const result = await verdict(["negate", "swap_args"], {
      symbol_id: "SYM-DOMAIN",
      arg: 1,
    });
    expect(result.certificate_rejection).toBeUndefined();
    expect(result.evidence_level).toBe("proved");
  });

  test("is refused when it misses a member", async () => {
    const result = await verdict(["negate"], {
      symbol_id: "SYM-DOMAIN",
      arg: 1,
    });
    expect(result.evidence_level).toBe("tested");
    expect(result.certificate_rejection).toContain("swap_args");
  });

  test("is refused when the domain names a field of a predicate", async () => {
    const result = await verdict(["negate", "swap_args"], {
      symbol_id: "SYM-DOMAIN",
      field: "name",
    });
    expect(result.evidence_level).toBe("tested");
    expect(result.certificate_rejection).toContain("arguments, not fields");
  });
});

describe("state machine and pattern symbols", () => {
  const MACHINE = `transition(pending, start, running).
transition(running, finish, done).
initial(pending).
`;

  test("a SWI-Prolog transition table with an initial state argument", async () => {
    const root = workspace({ "prolog/machine.pl": MACHINE });
    const ctx = context(root, {
      "SYM-T": { title: "transition/3", sourceFile: "prolog/machine.pl" },
      "SYM-I": { title: "initial/1", sourceFile: "prolog/machine.pl" },
    });
    expect(
      await evaluateMachine(
        ctx,
        contract({
          kind: "state_machine",
          domain_source: { symbol_id: "SYM-T" },
          initial_source: { symbol_id: "SYM-I", arg: 1 },
        } as Partial<ProofContract>),
      ),
    ).toEqual({
      ok: true,
      model: {
        states: ["done", "pending", "running"],
        transitions: [
          ["pending", "running"],
          ["running", "done"],
        ],
        initial: ["pending"],
      },
    });
  });

  test("arg is refused on a TypeScript or unknown-language symbol", async () => {
    const root = workspace({
      "src/pattern.ts": 'export const ID = "^[a-z]+$";\n',
      "src/pattern.rb": 'ID = "x"\n',
    });
    const ctx = context(root, {
      "SYM-TS": { title: "ID", sourceFile: "src/pattern.ts" },
      "SYM-RB": { title: "ID", sourceFile: "src/pattern.rb" },
    });
    const pattern = (symbol: string, extra: Record<string, unknown> = {}) =>
      evaluatePattern(
        ctx,
        contract({
          kind: "regex",
          pattern_source: { symbol_id: symbol, ...extra },
        } as Partial<ProofContract>),
      );
    expect(await pattern("SYM-NONE")).toEqual({
      ok: false,
      reason: "the pattern_source symbol SYM-NONE has no source file",
    });
    expect(await pattern("SYM-TS")).toEqual({
      ok: true,
      model: { type: "string", value: "^[a-z]+$" },
    });
    expect(await pattern("SYM-TS", { arg: 1 })).toEqual({
      ok: false,
      reason:
        "pattern_source.arg applies only to a SWI-Prolog predicate, not to TypeScript or JavaScript in src/pattern.ts",
    });
    expect(await pattern("SYM-RB", { arg: 1 })).toEqual({
      ok: false,
      reason:
        "pattern_source.arg applies only to a SWI-Prolog predicate, not to an unsupported language in src/pattern.rb",
    });
  });
});

describe("value_source project sources", () => {
  test("a Prolog source that cannot be read names its functor and argument", async () => {
    const root = workspace({});
    const values = await valueSourceValues(
      context(root, {}),
      contract({
        kind: "arithmetic",
        value_source: [
          {
            source: {
              reader: "prolog",
              file: "missing.pl",
              functor: "limit/1",
              arg: 1,
            },
            measure: "count",
          },
        ],
      } as Partial<ProofContract>),
    );
    expect(values.ok).toBe(false);
    if (!values.ok)
      expect(values.reason).toStartWith(
        "Kibi could not read the value_source limit/1 facts in missing.pl (argument 1): ",
      );
  });
});
