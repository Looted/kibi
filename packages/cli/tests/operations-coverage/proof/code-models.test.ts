import { afterAll, describe, expect, test } from "bun:test";
import {
  evaluateCodeModel,
  evaluateMachine,
  evaluatePattern,
  evaluateRuleModel,
  machineCertificateProblem,
  patternCertificateProblem,
  ruleCertificateProblem,
  stringConstraintProblem,
} from "../../../src/operations/proof/code-models.js";
import type { ProofContract } from "../../../src/public/proof-protocol.js";
import { context, scratch } from "../helpers.js";

const workspace = scratch({
  "src/rules.ts": [
    'export const ROLES = ["admin", "guest"];',
    'export const ACTIONS = new Set(["read", "write"]);',
    "export function canDo(role: string, action: string): boolean {",
    '  return role === "admin" || action === "read";',
    "}",
    "export function broken(role: string): boolean {",
    '  if (role === "guest") throw new Error("no guests");',
    "  return true;",
    "}",
    'export const MACHINE = { idle: ["busy"], busy: ["idle", "done"], done: [] };',
    'export const START = "idle";',
    "export const EVENTS = ['go'];",
    "export const ID = /^INV-\\d{6}$/u;",
    'export const NAME = "kibi";',
  ].join("\n"),
  "src/other.py": "ROLES = ['x']\n",
  "src/notes.txt": "plain text\n",
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
  symbol("SYM-actions", "ACTIONS"),
  symbol("SYM-can", "canDo"),
  symbol("SYM-broken", "broken"),
  symbol("SYM-machine", "MACHINE"),
  symbol("SYM-start", "START"),
  symbol("SYM-events", "EVENTS"),
  symbol("SYM-id", "ID"),
  symbol("SYM-name", "NAME"),
  symbol("SYM-py", "ROLES", "src/other.py"),
  { id: "SYM-nofile", type: "symbol", title: "x", source_file: "" },
]);
const contract = (fields: Record<string, unknown>) =>
  fields as unknown as ProofContract;

describe("rule models", () => {
  test("evaluates every predicate over its domains", async () => {
    const result = await evaluateRuleModel(
      ctx,
      contract({
        domains: {
          Role: { symbol_id: "SYM-roles" },
          Action: { symbol_id: "SYM-actions" },
        },
        predicate_source: { can: { symbol_id: "SYM-can" } },
      }),
      { can: ["Role", "Action"] },
    );
    expect(result).toStrictEqual({
      ok: true,
      model: {
        domains: { Role: ["admin", "guest"], Action: ["read", "write"] },
        predicates: {
          can: [
            { args: ["admin", "read"], value: true },
            { args: ["admin", "write"], value: true },
            { args: ["guest", "read"], value: true },
            { args: ["guest", "write"], value: false },
          ],
        },
      },
    });
  });

  test("reads a source domain from the project", async () => {
    const result = await evaluateRuleModel(
      ctx,
      contract({
        domains: { Route: { source: { reader: "glob", pattern: "routes/*.txt" } } },
        predicate_source: {},
      }),
      {},
    );
    expect(result).toStrictEqual({
      ok: false,
      reason: "the contract names no source",
    });
  });

  test("reports an unreadable source domain", async () => {
    const result = await evaluateRuleModel(
      ctx,
      contract({
        domains: { Route: { source: { reader: "json", file: "missing.json" } } },
      }),
      {},
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.reason).toStartWith(
        "Kibi could not read the domain Route from ",
      );
  });

  test("reports an unresolved domain, predicate or argument table", async () => {
    expect(
      await evaluateRuleModel(
        ctx,
        contract({ domains: { Role: { symbol_id: "SYM-missing" } } }),
        {},
      ),
    ).toStrictEqual({
      ok: false,
      reason: "the domains.Role symbol SYM-missing has no source file",
    });
    expect(
      await evaluateRuleModel(
        ctx,
        contract({ predicate_source: { can: { symbol_id: "SYM-nofile" } } }),
        {},
      ),
    ).toStrictEqual({
      ok: false,
      reason: "the predicate_source.can symbol SYM-nofile has no source file",
    });
    expect(
      await evaluateRuleModel(
        ctx,
        contract({ predicate_source: { can: { symbol_id: "SYM-can" } } }),
        {},
      ),
    ).toStrictEqual({
      ok: false,
      reason: "the certificate has no table for the predicate can",
    });
  });

  test("rejects a Prolog argument on a non-Prolog symbol", async () => {
    expect(
      await evaluateRuleModel(
        ctx,
        contract({ domains: { Role: { symbol_id: "SYM-roles", arg: 1 } } }),
        {},
      ),
    ).toStrictEqual({
      ok: false,
      reason:
        "domains.Role.arg applies only to a SWI-Prolog predicate, not to TypeScript or JavaScript in src/rules.ts",
    });
  });
});

describe("evaluateCodeModel", () => {
  test("refuses mixed languages and reports evaluator failures", () => {
    const mixed = evaluateCodeModel(
      workspace.root,
      [
        { file: `${workspace.root}/src/rules.ts`, export: "ROLES" },
        { file: `${workspace.root}/src/other.py`, export: "ROLES" },
        { file: `${workspace.root}/src/notes.txt`, export: "x" },
      ],
      { mode: "table" },
    );
    expect(mixed).toStrictEqual({
      ok: false,
      reason:
        "the contract's sources mix TypeScript or JavaScript and Python and unsupported files; one certificate reads one language",
    });
    const unsupported = evaluateCodeModel(
      workspace.root,
      [{ file: `${workspace.root}/src/notes.txt`, export: "x" }],
      { mode: "table" },
    );
    expect(unsupported.ok).toBe(false);
    if (!unsupported.ok)
      expect(unsupported.reason).toStartWith("Kibi could not evaluate the code: ");
    const unknownMode = evaluateCodeModel(
      workspace.root,
      [{ file: `${workspace.root}/src/rules.ts`, export: "ROLES" }],
      { mode: "nonsense" },
    );
    expect(unknownMode.ok).toBe(false);
    if (!unknownMode.ok)
      expect(unknownMode.reason).toStartWith("Kibi could not evaluate the code: ");
  });
});

describe("rule certificates", () => {
  const rule = contract({
    domains: {
      Role: { symbol_id: "SYM-roles" },
      Action: { symbol_id: "SYM-actions" },
    },
    predicate_source: { can: { symbol_id: "SYM-can" } },
  });
  const certificate = (overrides: Record<string, unknown> = {}) => ({
    domains: {
      Role: { symbol_id: "SYM-roles", members: ["guest", "admin"] },
      Action: { symbol_id: "SYM-actions", members: ["read", "write"] },
    },
    predicates: {
      can: {
        symbol_id: "SYM-can",
        arg_types: ["Role", "Action"],
        rows: [
          { args: ["admin", "read"], value: true },
          { args: ["admin", "write"], value: true },
          { args: ["guest", "read"], value: true },
          { args: ["guest", "write"], value: false },
        ],
      },
    },
    ...overrides,
  });

  test("accepts the code's own table", async () => {
    expect(await ruleCertificateProblem(ctx, rule, certificate())).toBeNull();
  });

  test("names mismatched keys and symbols", async () => {
    expect(
      await ruleCertificateProblem(ctx, rule, certificate({ domains: {} })),
    ).toBe(
      "the certificate's domains (none) are not the contract's (Action, Role)",
    );
    expect(
      await ruleCertificateProblem(
        ctx,
        contract({ domains: {}, predicate_source: undefined }),
        certificate({ domains: {}, predicates: { can: {} } }),
      ),
    ).toBe("the certificate's predicates (can) are not the contract's (none)");
    expect(
      await ruleCertificateProblem(
        ctx,
        rule,
        certificate({
          domains: {
            Role: { symbol_id: "SYM-other" },
            Action: { symbol_id: "SYM-actions" },
          },
        }),
      ),
    ).toBe("the certificate's domains.Role is SYM-other, not the contract's SYM-roles");
    expect(
      await ruleCertificateProblem(
        ctx,
        contract({ domains: { Role: { source: { reader: "glob", pattern: "x" } } } }),
        { domains: { Role: {} }, predicates: {} },
      ),
    ).toBe(
      "Kibi could not read the domain Role from files matching x: x matches no file",
    );
  });

  test("passes evaluation failures through", async () => {
    expect(
      await ruleCertificateProblem(
        ctx,
        contract({ predicate_source: { can: { symbol_id: "SYM-can" } } }),
        { predicates: { can: { symbol_id: "SYM-can", arg_types: ["Role"] } } },
      ),
    ).toStartWith("Kibi could not evaluate the code: ");
  });

  test("checks domains, failed calls, row counts and values", async () => {
    const members = certificate();
    members.domains.Role.members = ["admin"];
    expect(await ruleCertificateProblem(ctx, rule, members)).toBe(
      "the certificate's domain Role is not the values Kibi read from the code (admin, guest)",
    );
    const fewer = certificate();
    fewer.predicates.can.rows = fewer.predicates.can.rows.slice(1);
    expect(await ruleCertificateProblem(ctx, rule, fewer)).toBe(
      "the certificate's table for can has 3 rows, but the code's domains give 4",
    );
    const noRows = certificate();
    (noRows.predicates.can as Record<string, unknown>).rows = "none";
    expect(await ruleCertificateProblem(ctx, rule, noRows)).toBe(
      "the certificate's table for can has 0 rows, but the code's domains give 4",
    );
    const wrong = certificate();
    const last = wrong.predicates.can.rows[3];
    if (last) wrong.predicates.can.rows[3] = { ...last, value: true };
    expect(await ruleCertificateProblem(ctx, rule, wrong)).toBe(
      "the certificate says can(guest, write) is true, but the code decides false",
    );
    expect(
      await ruleCertificateProblem(
        ctx,
        contract({
          domains: { Role: { symbol_id: "SYM-roles" } },
          predicate_source: { broken: { symbol_id: "SYM-broken" } },
        }),
        {
          domains: { Role: { symbol_id: "SYM-roles", members: ["admin", "guest"] } },
          predicates: { broken: { symbol_id: "SYM-broken", arg_types: ["Role"] } },
        },
      ),
    ).toBe("broken(guest) failed when Kibi evaluated it: no guests");
  });
});

describe("state machines", () => {
  const machine = contract({
    domain_source: { symbol_id: "SYM-machine" },
    initial_source: { symbol_id: "SYM-start" },
  });
  const good = {
    machine: {
      symbol_id: "SYM-machine",
      states: ["busy", "done", "idle"],
      transitions: [
        ["idle", "busy"],
        ["busy", "idle"],
        ["busy", "done"],
      ],
      initial: ["idle"],
    },
  };

  test("evaluateMachine resolves each source", async () => {
    expect(await evaluateMachine(ctx, contract({}))).toStrictEqual({
      ok: false,
      reason: "the contract names no domain_source transition table",
    });
    expect(
      await evaluateMachine(ctx, contract({ domain_source: { symbol_id: "SYM-x" } })),
    ).toStrictEqual({
      ok: false,
      reason: "the domain_source symbol SYM-x has no source file",
    });
    expect(
      await evaluateMachine(
        ctx,
        contract({
          domain_source: { symbol_id: "SYM-machine" },
          initial_source: { symbol_id: "SYM-x" },
        }),
      ),
    ).toStrictEqual({
      ok: false,
      reason: "the initial_source symbol SYM-x has no source file",
    });
    expect(
      await evaluateMachine(
        ctx,
        contract({
          domain_source: { symbol_id: "SYM-machine" },
          domains: { event: { source: { reader: "glob", pattern: "x" } } },
        }),
      ),
    ).toStrictEqual({
      ok: false,
      reason:
        "domains.event names a source; a state machine's state and event domains are code exports",
    });
    expect(
      await evaluateMachine(
        ctx,
        contract({
          domain_source: { symbol_id: "SYM-machine" },
          domains: { event: { symbol_id: "SYM-x" } },
        }),
      ),
    ).toStrictEqual({
      ok: false,
      reason: "the domains.event symbol SYM-x has no source file",
    });
    const withDomains = await evaluateMachine(
      ctx,
      contract({
        domain_source: { symbol_id: "SYM-machine" },
        domains: { event: { symbol_id: "SYM-events" } },
      }),
    );
    expect(withDomains.ok).toBe(true);
  });

  test("accepts the code's machine and names each difference", async () => {
    expect(await machineCertificateProblem(ctx, machine, good)).toBeNull();
    expect(await machineCertificateProblem(ctx, machine, {})).toBe(
      "the certificate's machine is (none), not the contract's domain_source SYM-machine",
    );
    expect(await machineCertificateProblem(ctx, contract({}), {})).toBe(
      "the contract names no domain_source transition table",
    );
    expect(
      await machineCertificateProblem(ctx, machine, {
        machine: { ...good.machine, states: ["idle"] },
      }),
    ).toBe(
      "the certificate's states are not the machine Kibi read from the code (busy, done, idle)",
    );
    expect(
      await machineCertificateProblem(ctx, machine, {
        machine: { ...good.machine, transitions: "none" },
      }),
    ).toBe(
      "the certificate's transitions are not the machine Kibi read from the code (busy->done, busy->idle, idle->busy)",
    );
    expect(
      await machineCertificateProblem(ctx, machine, {
        machine: { ...good.machine, initial: [] },
      }),
    ).toBe(
      "the certificate's initial states are not the ones Kibi read from the code (idle)",
    );
    expect(
      await machineCertificateProblem(
        ctx,
        contract({ domain_source: { symbol_id: "SYM-machine" } }),
        { machine: { ...good.machine, initial: ["idle"] } },
      ),
    ).toBe(
      "the certificate's initial states are not the ones Kibi read from the code (none)",
    );
  });
});

describe("patterns", () => {
  test("evaluatePattern resolves its source", async () => {
    expect(await evaluatePattern(ctx, contract({}))).toStrictEqual({
      ok: false,
      reason: "the contract names no pattern_source",
    });
    expect(
      await evaluatePattern(ctx, contract({ pattern_source: { symbol_id: "SYM-x" } })),
    ).toStrictEqual({
      ok: false,
      reason: "the pattern_source symbol SYM-x has no source file",
    });
  });

  test("accepts the code's pattern or string and names each difference", async () => {
    const regex = contract({ pattern_source: { symbol_id: "SYM-id" } });
    const constant = contract({ pattern_source: { symbol_id: "SYM-name" } });
    const pattern = {
      symbol_id: "SYM-id",
      type: "regexp",
      source: "^INV-\\d{6}$",
      flags: "u",
      flavor: "js",
    };
    expect(await patternCertificateProblem(ctx, regex, { pattern })).toBeNull();
    expect(await patternCertificateProblem(ctx, regex, {})).toBe(
      "the certificate's pattern is (none), not the contract's pattern_source SYM-id",
    );
    expect(
      await patternCertificateProblem(ctx, contract({}), { pattern: {} }),
    ).toBe("the contract names no pattern_source");
    for (const changed of [
      { type: "string" },
      { source: "x" },
      { flags: "" },
      { flavor: "python" },
    ])
      expect(
        await patternCertificateProblem(ctx, regex, {
          pattern: { ...pattern, ...changed },
        }),
      ).toBe(
        "the certificate's pattern is not the one Kibi read from the code (/^INV-\\d{6}$/u)",
      );
    const value = { symbol_id: "SYM-name", type: "string", value: "kibi" };
    expect(
      await patternCertificateProblem(ctx, constant, { pattern: value }),
    ).toBeNull();
    for (const changed of [{ type: "regexp" }, { value: "other" }])
      expect(
        await patternCertificateProblem(ctx, constant, {
          pattern: { ...value, ...changed },
        }),
      ).toBe(
        'the certificate\'s value is not the string Kibi read from the code ("kibi")',
      );
  });

  test("decides pattern constraints exactly", () => {
    const certificate = {
      pattern: { type: "regexp", source: "^a+$", flags: "", flavor: "js" },
    };
    expect(
      stringConstraintProblem(certificate, { operator: "eq", value: "a" }, "FACT-1"),
    ).toStartWith("the code's pattern /^a+$/ does not accept exactly \"a\": ");
    expect(
      stringConstraintProblem(
        { pattern: { type: "regexp", source: "^a$", flags: "" } },
        { operator: "eq", value: "a" },
        "FACT-1",
      ),
    ).toBeNull();
    expect(
      stringConstraintProblem(certificate, { operator: "neq", value: "b" }, "FACT-1"),
    ).toBeNull();
    expect(
      stringConstraintProblem(certificate, { operator: "neq", value: "aa" }, "FACT-1"),
    ).toBe(
      'the code\'s pattern /^a+$/ accepts "aa", but FACT-1 requires it to reject it',
    );
    expect(
      stringConstraintProblem(
        certificate,
        { operator: "eq", value: "b", polarity: "forbid" },
        "FACT-1",
      ),
    ).toBeNull();
    expect(
      stringConstraintProblem(
        {
          pattern: { type: "regexp", source: "^b$", flags: "", flavor: "python" },
        },
        { operator: "neq", value: "b", polarity: "forbid" },
        "FACT-1",
      ),
    ).toBeNull();
    expect(
      stringConstraintProblem(
        certificate,
        { operator: "neq", value: "b", polarity: "forbid" },
        "FACT-1",
      ),
    ).toBe(
      'the code\'s pattern /^a+$/ rejects "b", but FACT-1 requires it to accept it',
    );
  });

  test("rethrows anything but an unsupported pattern", () => {
    // Nesting this deep overflows the parser's stack: a RangeError, not an
    // unsupported construct, so it propagates.
    const deep = `${"(".repeat(50_000)}a${")".repeat(50_000)}`;
    expect(() =>
      stringConstraintProblem(
        { pattern: { type: "regexp", source: deep, flags: "" } },
        { operator: "matches", value: "a" },
        "F",
      ),
    ).toThrow(RangeError);
  });
});
