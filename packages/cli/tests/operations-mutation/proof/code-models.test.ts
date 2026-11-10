import { afterAll, describe, expect, test } from "bun:test";
import path from "node:path";
import {
  evaluateCodeModel,
  evaluateMachine,
  evaluateRuleModel,
  factPattern,
  machineCertificateProblem,
  patternCertificateProblem,
  ruleCertificateProblem,
  stringConstraintProblem,
} from "../../../src/operations/proof/code-models.js";
import type { ProofContract } from "../../../src/public/proof-protocol.js";
import { context, scratch } from "../../operations-coverage/helpers.js";

const workspace = scratch({
  "src/rules.ts": [
    'export const ROLES = ["admin", "guest"];',
    'export const MANY = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];',
    "export function canDo(role: string): boolean {",
    '  return role === "admin";',
    "}",
    "export function both(a: string, b: string): boolean {",
    '  throw new Error(`no ${a}`);',
    "}",
    'export const STILL = { idle: [] };',
    'export const CHAIN = { a: ["b"], b: ["c"], c: ["d"], d: ["e"], e: ["f"], f: ["g"], g: ["h"], h: ["i"], i: ["j"], j: [] };',
    'export const STARTS = ["b", "a"];',
    'export const NAME = "kibi";',
    'export const BACK = ["b", "a"];',
  ].join("\n"),
  "src/exit.ts": "process.exit(3);\n",
  "src/noresult.ts": 'console.log("{}");\nprocess.exit(0);\n',
  "src/notok.ts": 'console.log(\'{"ok": false}\');\nprocess.exit(0);\n',
  "src/other.py": "ROLES = ['x']\n",
  "routes/a.txt": "a\n",
  "routes/b.txt": "b\n",
});
afterAll(() => workspace.cleanup());

const symbol = (id: string, title: string, file = "src/rules.ts") => ({
  id,
  type: "symbol",
  title,
  source_file: file,
});
const ctx = context(workspace.root, [
  symbol("SYM-roles", "ROLES"),
  symbol("SYM-many", "MANY"),
  symbol("SYM-can", "canDo"),
  symbol("SYM-both", "both"),
  symbol("SYM-still", "STILL"),
  symbol("SYM-chain", "CHAIN"),
  symbol("SYM-starts", "STARTS"),
  symbol("SYM-name", "NAME"),
  symbol("SYM-back", "BACK"),
  symbol("SYM-py", "ROLES", "src/other.py"),
]);
const contract = (fields: Record<string, unknown>) => fields as unknown as ProofContract;
const file = (relative: string) => path.join(workspace.root, relative);

describe("evaluateCodeModel", () => {
  test("refuses output that is not a result", () => {
    const run = (relative: string) =>
      evaluateCodeModel(workspace.root, [{ file: file(relative), export: "X" }], {
        mode: "pattern",
        pattern: { file: file(relative), export: "X" },
      });
    expect([run("src/exit.ts"), run("src/noresult.ts"), run("src/notok.ts")]).toStrictEqual([
      { ok: false, reason: "Kibi could not evaluate the code" },
      { ok: false, reason: "Kibi could not evaluate the code" },
      { ok: false, reason: "Kibi could not evaluate the code: unknown error" },
    ]);
  });
});

describe("rule models", () => {
  test("a source domain holds the members read from the project", async () => {
    expect(
      await evaluateRuleModel(
        ctx,
        contract({
          domains: { Route: { source: { reader: "glob", pattern: "routes/*.txt" } } },
          predicate_source: { can: { symbol_id: "SYM-can" } },
        }),
        { can: ["Route"] },
      ),
    ).toStrictEqual({
      ok: true,
      model: {
        domains: { Route: ["routes/a.txt", "routes/b.txt"] },
        predicates: {
          can: [
            { args: ["routes/a.txt"], value: false },
            { args: ["routes/b.txt"], value: false },
          ],
        },
      },
    });
  });

  test("a domain counts toward the languages of the read", async () => {
    expect(
      await evaluateRuleModel(
        ctx,
        contract({
          domains: { Role: { symbol_id: "SYM-py" } },
          predicate_source: { can: { symbol_id: "SYM-can" } },
        }),
        { can: ["Role"] },
      ),
    ).toStrictEqual({
      ok: false,
      reason:
        "the contract's sources mix Python and TypeScript or JavaScript files; one certificate reads one language",
    });
  });
});

describe("machines", () => {
  test("the initial states and domains count toward the languages of the read", async () => {
    const mixed: { ok: false; reason: string } = {
      ok: false,
      reason:
        "the contract's sources mix TypeScript or JavaScript and Python files; one certificate reads one language",
    };
    expect([
      await evaluateMachine(
        ctx,
        contract({
          domain_source: { symbol_id: "SYM-still" },
          initial_source: { symbol_id: "SYM-py" },
        }),
      ),
      await evaluateMachine(
        ctx,
        contract({
          domain_source: { symbol_id: "SYM-still" },
          domains: { State: { symbol_id: "SYM-py" } },
        }),
      ),
    ]).toStrictEqual([mixed, mixed]);
  });

  test("a machine without transitions or initial states", async () => {
    const still = contract({ domain_source: { symbol_id: "SYM-still" } });
    expect(
      await machineCertificateProblem(ctx, still, {
        machine: { symbol_id: "SYM-still", states: ["idle"] },
      }),
    ).toBeNull();
  });

  test("names at most eight transitions and every initial state", async () => {
    const chain = contract({
      domain_source: { symbol_id: "SYM-chain" },
      initial_source: { symbol_id: "SYM-starts" },
    });
    const states = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    expect(
      await machineCertificateProblem(ctx, chain, {
        machine: { symbol_id: "SYM-chain", states, transitions: [] },
      }),
    ).toBe(
      "the certificate's transitions are not the machine Kibi read from the code (a->b, b->c, c->d, d->e, e->f, f->g, g->h, h->i)",
    );
    const transitions = states.slice(0, -1).map((state, index) => [state, states[index + 1]]);
    expect(
      await machineCertificateProblem(ctx, chain, {
        machine: { symbol_id: "SYM-chain", states, transitions },
      }),
    ).toBe(
      "the certificate's initial states are not the ones Kibi read from the code (a, b)",
    );
    expect(
      await machineCertificateProblem(ctx, chain, {
        machine: { symbol_id: "SYM-chain", states, transitions, initial: ["a", "b"] },
      }),
    ).toBeNull();
  });

  test("a machine that is not an object names none", async () => {
    expect(
      await machineCertificateProblem(
        ctx,
        contract({ domain_source: { symbol_id: "SYM-still" } }),
        { machine: ["SYM-still"] },
      ),
    ).toBe("the certificate's machine is (none), not the contract's domain_source SYM-still");
  });
});

describe("rule certificates", () => {
  const rule = contract({
    domains: { Role: { symbol_id: "SYM-roles" } },
    predicate_source: { can: { symbol_id: "SYM-can" } },
  });
  const valid = () => ({
    domains: { Role: { symbol_id: "SYM-roles", members: ["guest", "admin"] } },
    predicates: {
      can: {
        symbol_id: "SYM-can",
        arg_types: ["Role"],
        rows: [
          { args: ["admin"], value: true },
          { args: ["guest"], value: false },
        ],
      },
    },
  });

  test("a certificate of the code re-checks", async () => {
    expect(await ruleCertificateProblem(ctx, rule, valid())).toBeNull();
  });

  test("certificate parts that are not objects are empty", async () => {
    expect(
      await ruleCertificateProblem(ctx, contract({}), { domains: "x", predicates: ["y"] }),
    ).toBe("the contract names no source");
    const rows = valid();
    rows.predicates.can.rows = ["x", ...rows.predicates.can.rows] as never;
    // A row that is not an object is a row of no arguments.
    expect(await ruleCertificateProblem(ctx, rule, rows)).toBe(
      "the certificate's table for can has 3 rows, but the code's domains give 2",
    );
  });

  test("compares domain values in any order", async () => {
    expect(
      await ruleCertificateProblem(
        ctx,
        contract({ domains: { Letter: { symbol_id: "SYM-back" } } }),
        { domains: { Letter: { symbol_id: "SYM-back", members: ["a", "b"] } } },
      ),
    ).toBeNull();
  });

  test("names the keys in order, and an entry without a symbol", async () => {
    expect(
      await ruleCertificateProblem(ctx, rule, { domains: { b: {}, a: {} }, predicates: {} }),
    ).toBe("the certificate's domains (a, b) are not the contract's (Role)");
    expect(await ruleCertificateProblem(ctx, rule, { predicates: {} })).toBe(
      "the certificate's domains (none) are not the contract's (Role)",
    );
    expect(
      await ruleCertificateProblem(ctx, rule, { domains: { Role: "x" }, predicates: {} }),
    ).toBe("the certificate's domains.Role is (none), not the contract's SYM-roles");
  });

  test("a source domain's members may be absent from the certificate", async () => {
    const routes = contract({
      domains: { Route: { source: { reader: "glob", pattern: "routes/*.txt" } } },
      predicate_source: { can: { symbol_id: "SYM-can" } },
    });
    expect(
      await ruleCertificateProblem(ctx, routes, {
        domains: { Route: "x" },
        predicates: { can: { symbol_id: "SYM-can", arg_types: ["Route"], rows: [] } },
      }),
    ).toBe(
      "the certificate's domain Route is not the values Kibi read from the code (routes/a.txt, routes/b.txt)",
    );
  });

  test("names at most eight domain values and every failing argument", async () => {
    const many = contract({
      domains: { Letter: { symbol_id: "SYM-many" } },
      predicate_source: { both: { symbol_id: "SYM-both" } },
    });
    const certificate = (members: string[]) => ({
      domains: { Letter: { symbol_id: "SYM-many", members } },
      predicates: { both: { symbol_id: "SYM-both", arg_types: ["Letter", "Letter"] } },
    });
    expect(await ruleCertificateProblem(ctx, many, certificate([]))).toBe(
      "the certificate's domain Letter is not the values Kibi read from the code (a, b, c, d, e, f, g, h)",
    );
    expect(
      await ruleCertificateProblem(
        ctx,
        many,
        certificate(["i", "h", "g", "f", "e", "d", "c", "b", "a"]),
      ),
    ).toBe("both(a, a) failed when Kibi evaluated it: no a");
    expect(
      await ruleCertificateProblem(
        ctx,
        many,
        certificate(["a", "b", "c", "d", "e", "f", "g", "h", "x"]),
      ),
    ).toBe(
      "the certificate's domain Letter is not the values Kibi read from the code (a, b, c, d, e, f, g, h)",
    );
  });
});

describe("pattern certificates", () => {
  test("a pattern that is not an object names none", async () => {
    expect(
      await patternCertificateProblem(
        ctx,
        contract({ pattern_source: { symbol_id: "SYM-name" } }),
        { pattern: "SYM-name" },
      ),
    ).toBe("the certificate's pattern is (none), not the contract's pattern_source SYM-name");
    expect(
      await patternCertificateProblem(
        ctx,
        contract({ pattern_source: { symbol_id: "SYM-name" } }),
        { pattern: { symbol_id: "SYM-name", type: "string", value: "kibi" } },
      ),
    ).toBeNull();
  });
});

describe("factPattern", () => {
  test("is a whole-string JavaScript pattern with the u flag", () => {
    expect(factPattern("a+")).toStrictEqual({
      type: "pattern",
      source: "a+",
      flags: "u",
      flavor: "js",
      mode: "full",
    });
  });
});

describe("stringConstraintProblem", () => {
  const string = { pattern: { type: "string", value: "abc" } };
  const check = (
    certificate: Record<string, unknown>,
    operator: string,
    value: string,
    polarity?: string,
  ) =>
    stringConstraintProblem(
      certificate,
      { operator, value, ...(polarity === undefined ? {} : { polarity }) },
      "FACT-1",
    );

  test("compares a string constant", () => {
    expect([
      check(string, "eq", "abc"),
      check(string, "eq", "x"),
      check(string, "eq", "a.c"),
      check(string, "neq", "x"),
      check(string, "neq", "abc"),
      check(string, "matches", "a.c"),
      check(string, "matches", "b"),
      check(string, "eq", "abc", "forbid"),
      check(string, "eq", "x", "forbid"),
    ]).toStrictEqual([
      null,
      'the code\'s string "abc" does not meet FACT-1\'s constraint eq "x"',
      'the code\'s string "abc" does not meet FACT-1\'s constraint eq "a.c"',
      null,
      'the code\'s string "abc" does not meet FACT-1\'s constraint neq "abc"',
      null,
      'the code\'s string "abc" does not meet FACT-1\'s constraint matches "b"',
      'the code\'s string "abc" meets FACT-1\'s constraint eq "abc", which the fact forbids',
      null,
    ]);
  });

  test("searches a pattern in its own flavor", () => {
    const python = { pattern: { type: "regexp", source: "^a\\Z", flags: "", flavor: "python" } };
    expect(check(python, "neq", "a")).toBe(
      'the code\'s pattern /^a\\Z/ accepts "a", but FACT-1 requires it to reject it',
    );
    expect(check({ pattern: { type: "regexp", source: "^a\\Z", flags: "" } }, "neq", "a")).toBe(
      "Kibi cannot decide the pattern exactly: the escape \\Z (at offset 3)",
    );
    expect(check({ pattern: { type: "regexp", source: "a", flags: "" } }, "neq", "xa")).toBe(
      'the code\'s pattern /a/ accepts "xa", but FACT-1 requires it to reject it',
    );
  });

  test("a forbidden match names a string both accept", () => {
    expect(
      check({ pattern: { type: "regexp", source: "^a+$", flags: "" } }, "matches", "a", "forbid"),
    ).toBe('the code\'s pattern /^a+$/ accepts "a", which FACT-1 forbids (it matches /a/)');
  });

  test("names what only the fact's pattern accepts", () => {
    expect(check({ pattern: { type: "regexp", source: "^a$", flags: "" } }, "matches", "a|b")).toBe(
      'the code\'s pattern /^a$/ does not accept exactly the strings matching /a|b/: "b" is in the fact\'s pattern only',
    );
  });

  test("a certificate without a pattern searches the empty pattern", () => {
    expect(check({}, "matches", "b")).toBe(
      "the code's pattern // does not accept exactly the strings matching /b/: \"\" is in the code's pattern only",
    );
  });
});
