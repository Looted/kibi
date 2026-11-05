import { afterAll, afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  environmentGetterCallee,
  judgeClaimBindings,
  namedClaimFiles,
  receiptEvidenceLevel,
  requiredFieldsFailures,
  requiredFieldsWitness,
  setEqualityWitness,
} from "../../../src/operations/proof/claim-bindings.js";
import * as certificates from "../../../src/operations/proof/code-certificates.js";
import type { CertificateVerdict } from "../../../src/operations/proof/code-certificates.js";
import type { ProofContract } from "../../../src/public/proof-protocol.js";
import type { ClaimBinding } from "../../../src/public/proof-receipt.js";
import { type FakeEntity, context, scratch } from "../../operations-coverage/helpers.js";

type Row = Record<string, unknown>;
type Compiled = ReturnType<typeof certificates.compileWitness>;

const workspace = scratch(
  {
    "src/domain.mts": "export type Color = 'a';\n",
    "src/read.ts": "",
    "src/y.ts": "",
    "src/ignored.ts": "",
    "src/other.ts": "",
    "lib/y.ts": "",
    "d1/x.ts": "",
    "d2/x.ts": "",
    "d3/x.ts": "",
    "d4/x.ts": "",
  },
  "kibi-claims-",
);
afterAll(() => workspace.cleanup());

/** The compiler stand-in: each call takes the next scripted answer. */
let answers: ((witnessPath: string) => Compiled)[] = [];
let witnesses: { path: string; text: string }[] = [];
let compile: { mockRestore: () => void } | undefined;
beforeEach(() => {
  answers = [];
  witnesses = [];
  compile = spyOn(certificates, "compileWitness").mockImplementation(
    (root: string, witnessPath: string) => {
      witnesses.push({
        path: witnessPath,
        text: readFileSync(path.resolve(root, witnessPath), "utf8"),
      });
      const next = answers.shift();
      return next === undefined ? { ok: false, reason: "" } : next(witnessPath);
    },
  );
});
afterEach(() => compile?.mockRestore());

const entities: FakeEntity[] = [
  { id: "SYM-dom", type: "symbol", title: "Color", source_file: "src/domain.mts" },
  { id: "SYM-nofile", type: "symbol", title: "X" },
  { id: "SYM-dotted", type: "symbol", title: "T", source_file: "src/a.tsx.ts" },
  { id: "SYM-gone", type: "symbol", title: "G", source_file: "missing/domain.ts" },
  { id: "SYM-r", type: "symbol", title: "R", source_file: "src/read.ts" },
  { id: "SYM-o", type: "symbol", title: "O", source_file: "src/other.ts" },
  { id: "SYM-o2", type: "symbol", title: "O2", source_file: "src/other.ts" },
  { id: "SYM-y", type: "symbol", title: "Y", source_file: "lib/y.ts" },
  { id: "SYM-d1", type: "symbol", title: "D1", source_file: "d1/x.ts" },
  { id: "SYM-d2", type: "symbol", title: "D2", source_file: "d2/x.ts" },
  { id: "SYM-d3", type: "symbol", title: "D3", source_file: "d3/x.ts" },
  { id: "FACT-other", type: "fact", subject_key: "src/other.ts", claim_text: "" },
  { id: "FACT-short", type: "fact", subject_key: "k", claim_text: "see other.ts" },
  { id: "FACT-many", type: "fact", subject_key: "k", claim_text: "see x.ts" },
  { id: "FACT-y", type: "fact", subject_key: "k", claim_text: "see y.ts" },
];

type Options = {
  verdict?: CertificateVerdict;
  coveredBy?: string[];
  modelCheck?: Row;
  rels?: string | null;
  implementsFails?: string | null;
  obligationsFail?: boolean;
};

function harness(rows: Row[], options: Options = {}) {
  const ctx = context(workspace.root, entities, (goal) => {
    if (goal.includes("test_claim_obligations_json"))
      return options.obligationsFail
        ? { success: false, bindings: {}, error: "down" }
        : { success: true, bindings: { JsonString: JSON.stringify(rows) } };
    if (goal.includes("claim_model_check_json"))
      return {
        success: true,
        bindings: { JsonString: JSON.stringify(options.modelCheck ?? { ok: true }) },
      };
    if (goal.includes("kb_relationship(implements")) {
      if (options.implementsFails !== undefined)
        return {
          success: false,
          bindings: {},
          ...(options.implementsFails === null ? {} : { error: options.implementsFails }),
        };
      return {
        success: true,
        bindings: options.rels === null ? {} : { Rels: options.rels ?? "[]" },
      };
    }
    return undefined;
  });
  return { ctx, goals: (ctx.prolog as unknown as { goals: string[] }).goals };
}

const proved = (certificate?: Row): CertificateVerdict => ({
  kind: "rule",
  evidence_level: "proved",
  ...(certificate === undefined ? {} : { certificate }),
});

function obligation(fields: Row | unknown, extra: Row = {}): Row {
  return {
    claim_key: "c1",
    requirement_id: "REQ-1",
    fact_id: "FACT-1",
    result: "obligation",
    obligation: fields,
    ...extra,
  };
}

async function judge(
  rows: Row[],
  contractFields: Row,
  options: Options = {},
): Promise<ClaimBinding[] | undefined> {
  const { ctx } = harness(rows, options);
  return judgeClaimBindings(ctx, {
    testId: "TEST-1",
    contract: { proves: ["c1"], ...contractFields } as unknown as ProofContract,
    verdict: options.verdict ?? proved({}),
    coveredBySymbols: options.coveredBy ?? [],
  });
}

const reasonOf = async (...args: Parameters<typeof judge>) => {
  const rows = await judge(...args);
  return rows?.map((row) => (row.binding === "derived" ? `derived ${row.scope}` : row.reason));
};

/** The entity lookups a run made, as "id type". */
function lookups(goals: readonly string[]): string[] {
  return goals.flatMap((goal) => {
    const match = /kb_entity\(('(?:[^']|'')*'|_|[A-Z]\w*),\s*'?(\w+)'?/.exec(goal);
    return match === null ? [] : [`${match[1]} ${match[2]}`];
  });
}

describe("witness texts", () => {
  test("set equality", () => {
    expect(setEqualityWitness("./d.js", ["a", "b"], "domain.X")).toBe(
      [
        'import type * as domain from "./d.js";',
        "type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;",
        "type Members = domain.X;",
        'const exact: Equals<Members, "a" | "b"> = true;',
        "void exact;",
        "export {};",
        "",
      ].join("\n"),
    );
  });

  test("required fields, and which fields a failed compile rejects", () => {
    const witness = requiredFieldsWitness("./d.js", "domain.U", ["id", "name"]);
    expect(witness).toBe(
      [
        'import type * as domain from "./d.js";',
        "type Shape = domain.U;",
        "type HasKey<K extends PropertyKey> = K extends keyof Shape ? true : false;",
        "type IsRequired<K extends PropertyKey> = K extends keyof Shape",
        "  ? {} extends Pick<Shape, K> ? false : undefined extends Shape[K] ? false : null extends Shape[K] ? false : true",
        "  : false;",
        'const key0: HasKey<"id"> = true;',
        'const required0: IsRequired<"id"> = true;',
        'const key1: HasKey<"name"> = true;',
        'const required1: IsRequired<"name"> = true;',
        "void [key0, required0, key1, required1];",
        "export {};",
        "",
      ].join("\n"),
    );
    expect(requiredFieldsFailures(witness, ["id", "name"], [6, 9])).toStrictEqual([
      "id is not a field",
      "name is optional or nullable",
    ]);
    expect(requiredFieldsFailures(witness, ["id", "name"], [6, 7])).toStrictEqual([
      "id is not a field",
    ]);
  });
});

describe("typecheck set claims", () => {
  const contract = { kind: "typecheck", domain_source: { symbol_id: "SYM-dom" } };
  const set = obligation({ kind: "set_equals", members: ["a", "b"] });

  test("tries each spelling of the members and names the last reason", async () => {
    const failed =
      (detail: string) =>
      (witnessPath: string): Compiled => ({
        ok: false,
        reason: `TS2322 in the witness ${witnessPath}: ${detail}`,
      });
    answers = [failed("one"), failed("two"), failed("three"), failed("bad")];
    expect(await reasonOf([set], contract, { coveredBy: ["SYM-dom"] })).toStrictEqual([
      "Color as a type is not exactly the fact's set {a, b} (TS2322 in the set-equality witness: bad)",
    ]);
    expect(
      witnesses.map((witness) => witness.text.split("\n").slice(0, 3)[2]),
    ).toStrictEqual([
      "type Members = domain.Color;",
      "type Members = (typeof domain.Color)[number];",
      "type Members = `${domain.Color}`;",
      "type Members = keyof typeof domain.Color;",
    ]);
    expect(witnesses[0]?.text.split("\n")[0]).toBe('import type * as domain from "./domain.js";');
    expect(new Set(witnesses.map((witness) => witness.path)).size).toBe(1);
    expect(witnesses[0]?.path).toMatch(/^src\/\.kibi-claim-witness-[0-9a-f]{12}\.ts$/);
    expect(readdirSync(path.join(workspace.root, "src")).sort()).toStrictEqual([
      "domain.mts",
      "ignored.ts",
      "other.ts",
      "read.ts",
      "y.ts",
    ]);
  });

  test("a compiled spelling derives the claim", async () => {
    answers = [() => ({ ok: false, reason: "x" }), () => ({ ok: true, version: "5" })];
    expect(await reasonOf([set], contract, { coveredBy: ["SYM-dom"] })).toStrictEqual([
      "derived code",
    ]);
    expect(witnesses).toHaveLength(2);
  });

  test("names the export, a missing domain and a domain without a file", async () => {
    expect(
      await reasonOf(
        [set],
        { kind: "typecheck", domain_source: { symbol_id: "SYM-dom", export: "Palette" } },
        { coveredBy: ["SYM-dom"] },
      ),
    ).toStrictEqual(["Palette as a type is not exactly the fact's set {a, b}"]);
    expect(witnesses[0]?.text).toContain("type Members = domain.Palette;");
    expect(await reasonOf([set], { kind: "typecheck" }, { coveredBy: [""] })).toStrictEqual([
      "the contract names no domain_source symbol",
    ]);
    expect(
      await reasonOf(
        [set],
        { kind: "typecheck", domain_source: { symbol_id: "SYM-nofile" } },
        { coveredBy: ["SYM-nofile"] },
      ),
    ).toStrictEqual(["the domain_source symbol SYM-nofile has no source file"]);
  });

  test("imports the module beside the domain file", async () => {
    workspace.write("src/a.tsx.ts", "");
    await judge([set], { kind: "typecheck", domain_source: { symbol_id: "SYM-dotted" } }, {
      coveredBy: ["SYM-dotted"],
    });
    expect(witnesses[0]?.text.split("\n")[0]).toBe('import type * as domain from "./a.tsx.js";');
  });

  test("a witness that cannot be written fails the judgement", async () => {
    expect(
      judge([set], { kind: "typecheck", domain_source: { symbol_id: "SYM-gone" } }, {
        coveredBy: ["SYM-gone"],
      }),
    ).rejects.toThrow(/^ENOENT: no such file or directory, open /);
  });
});

describe("typecheck required-field claims", () => {
  const contract = { kind: "typecheck", domain_source: { symbol_id: "SYM-dom" } };
  const fields = obligation({ kind: "required_fields", members: ["id", "name"] });
  const run = () => reasonOf([fields], contract, { coveredBy: ["SYM-dom"] });

  test("a compiled witness derives the claim", async () => {
    answers = [() => ({ ok: true, version: "5" })];
    expect(await run()).toStrictEqual(["derived code"]);
  });

  test("the first type that names a real type decides the failing fields", async () => {
    answers = [
      () => ({ ok: false, reason: "a", errorLines: [6] }),
      () => ({ ok: false, reason: "b", errorLines: [9] }),
    ];
    expect(await run()).toStrictEqual([
      "Color does not have every field of {id, name} as a required, non-nullable field: id is not a field",
    ]);
    expect(witnesses.map((witness) => witness.text.split("\n")[1])).toStrictEqual([
      "type Shape = domain.Color;",
      "type Shape = InstanceType<typeof domain.Color>;",
    ]);
  });

  test("skips a type expression that names no type", async () => {
    answers = [
      () => ({ ok: false, reason: "a", errorLines: [1, 6] }),
      () => ({ ok: false, reason: "b", errorLines: [6, 9] }),
    ];
    expect(await run()).toStrictEqual([
      "Color does not have every field of {id, name} as a required, non-nullable field: id is not a field; name is optional or nullable",
    ]);
  });

  test("a later type decides when the first fails on no field", async () => {
    answers = [
      () => ({ ok: false, reason: "a", errorLines: [0] }),
      () => ({ ok: false, reason: "b", errorLines: [9] }),
    ];
    expect(await run()).toStrictEqual([
      "Color does not have every field of {id, name} as a required, non-nullable field: name is optional or nullable",
    ]);
  });

  test("members that are not a list name no fields", async () => {
    expect(
      await reasonOf([obligation({ kind: "required_fields", members: "id" })], contract, {
        coveredBy: ["SYM-dom"],
      }),
    ).toStrictEqual(["Color does not have every field of {} as a required, non-nullable field"]);
    expect(witnesses[0]?.text).toContain("void [];");
  });

  test("falls back to the compiler's reason", async () => {
    answers = [
      () => ({ ok: false, reason: "a", errorLines: [1, 6] }),
      (witnessPath) => ({ ok: false, reason: `bad in the witness ${witnessPath}` }),
    ];
    expect(await run()).toStrictEqual([
      "Color does not have every field of {id, name} as a required, non-nullable field (bad in the required-fields witness)",
    ]);
    answers = [() => ({ ok: false, reason: "" }), () => ({ ok: false, reason: "" })];
    expect(await run()).toStrictEqual([
      "Color does not have every field of {id, name} as a required, non-nullable field",
    ]);
    expect(
      await reasonOf([fields], { kind: "typecheck", domain_source: { symbol_id: "SYM-nofile" } }, {
        coveredBy: ["SYM-nofile"],
      }),
    ).toStrictEqual(["the domain_source symbol SYM-nofile has no source file"]);
    expect(await reasonOf([fields], { kind: "typecheck" }, { coveredBy: [""] })).toStrictEqual([
      "the contract names no domain_source symbol",
    ]);
  });

  test("names the export and imports beside the domain file", async () => {
    workspace.write("src/a.tsx.ts", "");
    answers = [() => ({ ok: true, version: "5" })];
    await judge(
      [fields],
      { kind: "typecheck", domain_source: { symbol_id: "SYM-dotted", export: "Shape" } },
      { coveredBy: ["SYM-dotted"] },
    );
    expect(witnesses[0]?.text.split("\n").slice(0, 2)).toStrictEqual([
      'import type * as domain from "./a.tsx.js";',
      "type Shape = domain.Shape;",
    ]);
    expect(witnesses[0]?.path).toMatch(/^src\/\.kibi-claim-witness-[0-9a-f]{12}\.ts$/);
    expect(readdirSync(path.join(workspace.root, "src"))).not.toContain(
      path.basename(witnesses[0]?.path ?? ""),
    );
  });

  test("a witness that cannot be written fails the judgement", async () => {
    expect(
      judge([fields], { kind: "typecheck", domain_source: { symbol_id: "SYM-gone" } }, {
        coveredBy: ["SYM-gone"],
      }),
    ).rejects.toThrow(/^ENOENT: no such file or directory, open /);
  });
});

describe("non-numeric claims", () => {
  const rule = {
    kind: "rule",
    domain_source: { symbol_id: "S1" },
    initial_source: { symbol_id: "S2" },
    pattern_source: { symbol_id: "S3" },
    domains: { A: { symbol_id: "S4" }, B: { source: { reader: "glob" } }, C: { symbol_id: "" } },
    predicate_source: { p: { symbol_id: "S5" }, q: { symbol_id: "S6", harness_for: ["S7"] } },
  };
  const all = ["S1", "S2", "S3", "S4", "S5", "S6", "S7"];
  const holds = obligation({ kind: "rule_holds" });

  test("every symbol the certificate read must be in code scope", async () => {
    expect(await reasonOf([holds], rule, { coveredBy: all })).toStrictEqual(["derived harness"]);
    for (const missing of all)
      expect(
        await reasonOf([holds], rule, { coveredBy: all.filter((id) => id !== missing) }),
      ).toStrictEqual([
        `the symbol ${missing} the certificate read is not in the receipt's code scope: link it covered_by the test so a change to it stales the proof`,
      ]);
  });

  test("model checks a claim in Prolog", async () => {
    const { ctx, goals } = harness([obligation({ kind: "required_fields" })], {
      modelCheck: { ok: false },
    });
    const rows = await judgeClaimBindings(ctx, {
      testId: "TEST-'1",
      contract: { proves: ["c1"], kind: "rule" } as unknown as ProofContract,
      verdict: proved({ a: "'" }),
      coveredBySymbols: [],
    });
    expect(rows?.map((row) => row.reason)).toStrictEqual(["the model check failed"]);
    expect(
      goals.map((goal) => /^\(use_module\('[^']*\/(\w+\.pl)'\), (.*)\)$/.exec(goal)?.slice(1)),
    ).toStrictEqual([
      [
        "claim_obligations.pl",
        `claim_obligations:test_claim_obligations_json('TEST-''1', '["c1"]', 'rule', JsonString)`,
      ],
      [
        "claim_obligations.pl",
        `claim_obligations:claim_model_check_json('rule', '{"kind":"required_fields"}', '{"a":"''"}', JsonString)`,
      ],
    ]);
  });

  test("a typecheck contract model checks other kinds and keeps the model's reason", async () => {
    expect(
      await reasonOf([holds], { kind: "typecheck" }, { modelCheck: { ok: false, reason: "no" } }),
    ).toStrictEqual(["no"]);
    expect(witnesses).toStrictEqual([]);
  });

  test("labels a failed model check", async () => {
    const { ctx } = harness([holds]);
    const query = ctx.prolog?.query.bind(ctx.prolog);
    const prolog = {
      ...ctx.prolog,
      query: async (goal: string) =>
        goal.includes("claim_model_check_json")
          ? { success: false, bindings: {}, error: "boom" }
          : (query as NonNullable<typeof query>)(goal),
    };
    expect(
      judgeClaimBindings({ ...ctx, prolog } as typeof ctx, {
        testId: "TEST-1",
        contract: { proves: ["c1"], kind: "rule" } as unknown as ProofContract,
        verdict: proved({}),
        coveredBySymbols: [],
      }),
    ).rejects.toThrow("Claim model check query failed: boom");
  });
});

describe("exhaustive set claims", () => {
  const exhaustive = { kind: "exhaustive", domain_source: { symbol_id: "SYM-dom" } };

  test("the domain must be in code scope", async () => {
    expect(await reasonOf([obligation({ members: [] })], exhaustive)).toStrictEqual([
      "the domain_source symbol SYM-dom is not in the receipt's code scope: link it covered_by the test so a change to the domain stales the proof",
    ]);
  });

  test("compares the members read with the fact's set", async () => {
    const certificate = (members: unknown) => ({ verdict: proved({ domain: { members } }), coveredBy: ["SYM-dom"] });
    expect(
      await reasonOf(
        [obligation({ members: ["m1", "m2", "m3", "m4", "m5", "m6", "m7"] })],
        exhaustive,
        certificate(["m1", "x6", "x5", "x4", "x3", "x2", "x1"]),
      ),
    ).toStrictEqual([
      "the domain members Kibi read are not FACT-1's set (missing m2, m3, m4, m5, m6; not in the set x1, x2, x3, x4, x5)",
    ]);
    expect(
      await reasonOf([obligation({ members: ["a", "b"] })], exhaustive, certificate(["a"])),
    ).toStrictEqual(["the domain members Kibi read are not FACT-1's set (missing b)"]);
    expect(
      await reasonOf(
        [obligation({ members: ["a"] }, { fact_id: undefined })],
        exhaustive,
        certificate(["a", "c", 1]),
      ),
    ).toStrictEqual(["the domain members Kibi read are not the grounding fact's set (not in the set 1, c)"]);
    expect(
      await reasonOf([obligation({ members: ["a"] })], exhaustive, certificate(["a", "a"])),
    ).toStrictEqual(["derived code"]);
    expect(
      await reasonOf([obligation({ members: ["b", "a"] })], exhaustive, certificate(["a", "b"])),
    ).toStrictEqual(["derived code"]);
  });

  test("an absent domain and set are both empty", async () => {
    expect(
      await reasonOf([obligation({})], { kind: "exhaustive" }, { coveredBy: [""], verdict: proved({}) }),
    ).toStrictEqual(["derived code"]);
    expect(
      await reasonOf([obligation({})], exhaustive, {
        coveredBy: ["SYM-dom"],
        verdict: proved({ domain: { members: "a" } }),
      }),
    ).toStrictEqual(["derived code"]);
  });
});

describe("obligations that are not objects", () => {
  test("read as empty", async () => {
    const certificate = { variable: "", value_type: "", claim: [] };
    for (const value of [["x"], "x", null])
      expect(
        await judge([obligation(value)], { kind: "arithmetic" }, { verdict: proved(certificate) }),
      ).toStrictEqual([
        {
          claim_key: "c1",
          requirement_id: "REQ-1",
          fact_id: "FACT-1",
          binding: "rejected",
          obligation: {},
          reason:
            "the certificate's claim is not FACT-1's constraint (undefined undefined undefined)",
        },
      ]);
  });
});

describe("source reads by reference", () => {
  const references = (source: Row = {}) => ({
    proves: ["c1"],
    kind: "source",
    source: { reader: "references", files: "src/read.ts", ...source },
  });
  const ruleHolds = (extra: Row = {}, fields: Row = {}) =>
    obligation({ kind: "rule_holds", ...fields }, extra);

  test("derives a claim whose code the read covers, loading each symbol once", async () => {
    const { ctx, goals } = harness([ruleHolds({ fact_id: "FACT-y" })], {
      rels: "[['SYM-r','REQ-1',implements],[x,'REQ-2',implements]]",
    });
    const rows = await judgeClaimBindings(ctx, {
      testId: "TEST-1",
      contract: references({ files: ["src/read.ts", "src/y.ts", 3] }) as unknown as ProofContract,
      verdict: proved({}),
      coveredBySymbols: ["SYM-r"],
    });
    expect(rows?.map((row) => [row.binding, row.scope])).toStrictEqual([["derived", "source"]]);
    expect(lookups(goals)).toStrictEqual(["'FACT-y' fact", "'SYM-r' symbol"]);
  });

  test("names the symbols outside the read", async () => {
    expect(
      await reasonOf([ruleHolds()], references(), {
        coveredBy: ["SYM-o", "SYM-r", "SYM-none"],
        rels: "[['SYM-o','REQ-1',implements],['SYM-y','REQ-1',implements]]",
      }),
    ).toStrictEqual([
      "the read does not cover the code the claim is about: SYM-o (src/other.ts) is covered by the test; SYM-y (lib/y.ts) implements REQ-1. Kibi decides the claim only on the files it reads, so add those files to files; if Kibi cannot read them, the claim cannot be decided for them",
    ]);
    expect(
      await reasonOf([ruleHolds()], references(), { coveredBy: ["SYM-d1", "SYM-d2", "SYM-d3"] }),
    ).toStrictEqual([
      "the read does not cover the code the claim is about: SYM-d1 (d1/x.ts) is covered by the test; SYM-d2 (d2/x.ts) is covered by the test; SYM-d3 (d3/x.ts) is covered by the test. Kibi decides the claim only on the files it reads, so add those files to files; if Kibi cannot read them, the claim cannot be decided for them",
    ]);
    expect(
      await reasonOf([ruleHolds()], references(), {
        coveredBy: ["SYM-d1", "SYM-d2", "SYM-d3", "SYM-o", "SYM-o2"],
      }),
    ).toStrictEqual([
      "the read does not cover the code the claim is about: SYM-d1 (d1/x.ts) is covered by the test; SYM-d2 (d2/x.ts) is covered by the test; SYM-d3 (d3/x.ts) is covered by the test and 2 more. Kibi decides the claim only on the files it reads, so add those files to files; if Kibi cannot read them, the claim cannot be decided for them",
    ]);
  });

  test("names every implementer of the requirement", async () => {
    expect(
      await reasonOf([ruleHolds()], references(), {
        rels: "[['SYM-o','REQ-1',implements],['SYM-y','REQ-1',implements]]",
      }),
    ).toStrictEqual([
      "the read does not cover the code the claim is about: SYM-o (src/other.ts) implements REQ-1; SYM-y (lib/y.ts) implements REQ-1. Kibi decides the claim only on the files it reads, so add those files to files; if Kibi cannot read them, the claim cannot be decided for them",
    ]);
  });

  test("ignored files are not read", async () => {
    expect(
      await reasonOf([ruleHolds()], references({ files: "src/*.ts", ignore: "src/other.ts" }), {
        coveredBy: ["SYM-o"],
      }),
    ).toStrictEqual([
      "the read does not cover the code the claim is about: SYM-o (src/other.ts) is covered by the test. Kibi decides the claim only on the files it reads, so add those files to files; if Kibi cannot read them, the claim cannot be decided for them",
    ]);
  });

  test("looks up implementers only for the row's requirement", async () => {
    const { ctx, goals } = harness([ruleHolds({ requirement_id: undefined, fact_id: undefined })], {
      rels: "[['SYM-o','REQ-1',implements]]",
    });
    const rows = await judgeClaimBindings(ctx, {
      testId: "TEST-1",
      contract: references() as unknown as ProofContract,
      verdict: proved({}),
      coveredBySymbols: [],
    });
    expect(rows?.map((row) => row.binding)).toStrictEqual(["derived"]);
    expect(lookups(goals)).toStrictEqual([]);
  });

  test("the claim's named files must be read", async () => {
    expect(
      await reasonOf([ruleHolds({ fact_id: "FACT-other" })], references()),
    ).toStrictEqual([
      "the claim is about src/other.ts, which the read does not include. Kibi decides the claim only on the files it reads, so add that file to files; if Kibi cannot read it, the claim cannot be decided",
    ]);
    expect(await reasonOf([ruleHolds({ fact_id: "FACT-short" })], references())).toStrictEqual([
      "the claim is about other.ts (src/other.ts), which the read does not include. Kibi decides the claim only on the files it reads, so add that file to files; if Kibi cannot read it, the claim cannot be decided",
    ]);
    expect(await reasonOf([ruleHolds({ fact_id: "FACT-many" })], references())).toStrictEqual([
      "the claim is about x.ts (d1/x.ts, d2/x.ts, d3/x.ts), which the read does not include. Kibi decides the claim only on the files it reads, so add that file to files; if Kibi cannot read it, the claim cannot be decided",
    ]);
    expect(
      await reasonOf([ruleHolds({ fact_id: "FACT-y" })], references({ files: ["src/y.ts"] })),
    ).toStrictEqual(["derived source"]);
  });

  test("a string_args read of an environment getter cannot decide a closed claim", async () => {
    const getter = references({ extract: "string_args", callee: "os.Getenv" });
    expect(await reasonOf([ruleHolds({}, { operator: "eq" })], getter)).toStrictEqual([
      "a string_args read of os.Getenv sees only that getter's arguments, not the other ways the code reads the environment, so it cannot decide a eq claim; read the files with extract env",
    ]);
    expect(await reasonOf([ruleHolds({}, { operator: "lte" })], getter)).toStrictEqual([
      "derived source",
    ]);
    expect(
      await reasonOf(
        [ruleHolds({}, { operator: "eq" })],
        references({ extract: "env", callee: "os.Getenv" }),
      ),
    ).toStrictEqual(["derived source"]);
    expect(
      await reasonOf(
        [ruleHolds({}, { operator: "eq" })],
        references({ extract: "string_args", callee: 5 }),
      ),
    ).toStrictEqual(["derived source"]);
    expect(
      await reasonOf(
        [{ claim_key: "c1", result: "obligation" }],
        references({ extract: "string_args", callee: "os.Getenv" }),
      ),
    ).toStrictEqual([
      "the query does not assert the negation of the grounding fact's constraint (assert (not (undefined undefined NaN)))",
    ]);
  });

  test("checks only a references read of a source contract", async () => {
    const outside = { coveredBy: ["SYM-o"] };
    expect(
      await reasonOf([ruleHolds()], { kind: "source", source: { reader: "glob" } }, outside),
    ).toStrictEqual(["derived source"]);
    expect(await reasonOf([ruleHolds()], { kind: "source" }, outside)).toStrictEqual([
      "derived source",
    ]);
    expect(
      await reasonOf([ruleHolds()], { kind: "rule", source: { reader: "references" } }, outside),
    ).toStrictEqual(["derived code"]);
  });

  test("an implements query that fails stops the judgement", async () => {
    expect(
      judge([ruleHolds()], references(), { implementsFails: "boom" }),
    ).rejects.toThrow("implements relationship query failed: boom");
    expect(
      judge([ruleHolds()], references(), { implementsFails: null }),
    ).rejects.toThrow("implements relationship query failed: Unknown error");
    expect(await reasonOf([ruleHolds()], references(), { rels: null })).toStrictEqual([
      "derived source",
    ]);
  });
});

describe("namedClaimFiles", () => {
  const files = scratch({
    "src/match.c": "",
    "vendor/src/match.c": "",
    "other/match.c": "",
    "src/a.cc.orig": "",
    "src/a.b/c.txt": "",
    "x..c": "",
    "my file.c": "",
    README: "",
  });
  afterAll(() => files.cleanup());
  const named = (...texts: string[]) => Object.fromEntries(namedClaimFiles(files.root, texts));

  test("resolves a path, then a suffix, then a stem", () => {
    expect(named("src/match.c")).toStrictEqual({ "src/match.c": ["src/match.c"] });
    expect(named("fzy/src/match.c")).toStrictEqual({
      "fzy/src/match.c": ["src/match.c", "vendor/src/match.c"],
    });
    expect(named("src/Match.C")).toStrictEqual({ "src/Match.C": ["src/match.c"] });
    expect(named("see src/match")).toStrictEqual({
      "src/match": ["src/match.c", "vendor/src/match.c"],
    });
    expect(named("`src/a.b/c`")).toStrictEqual({ "src/a.b/c": ["src/a.b/c.txt"] });
  });

  test("strips a leading dot and slashes", () => {
    expect(named("'./src/match.c'")).toStrictEqual({
      "./src/match.c": ["src/match.c"],
      "src/match.c": ["src/match.c"],
    });
    expect(named("'/src/match.c'")).toStrictEqual({
      "/src/match.c": ["src/match.c"],
      "src/match.c": ["src/match.c"],
    });
    expect(named("'.//src/match.c'")).toStrictEqual({
      ".//src/match.c": ["src/match.c"],
      "src/match.c": ["src/match.c"],
    });
  });

  test("a name with an extension or without a slash has no stem", () => {
    expect(named("src/a.cc")).toStrictEqual({});
    expect(named("`x.`")).toStrictEqual({});
  });

  test("reads quoted paths, and slashed names of any depth", () => {
    expect(named("'README'")).toStrictEqual({});
    expect(named("see src/a.b/c")).toStrictEqual({ "src/a.b/c": ["src/a.b/c.txt"] });
  });

  test("trims quoted paths and skips names that resolve to nothing", () => {
    expect(named("'my file.c '")).toStrictEqual({ "my file.c": ["my file.c"] });
    expect(named("kibi.cli zz/none.c")).toStrictEqual({});
  });
});

describe("environmentGetterCallee", () => {
  test("strips spaces and an arity and anchors each spelling", () => {
    const cases: [string, boolean][] = [
      ["os . Getenv", true],
      ["getenv/12", true],
      ["process/1.env", false],
      ["getenv/1x", false],
      ["GetEnvironmentVariableA", true],
      ["std::env::var", true],
      ["std::env::varx", false],
      ["Env::get", true],
      ["Env::getAll", false],
      ["process.env", true],
      ["myprocess.env", false],
      ["process.envx", false],
    ];
    expect(cases.map(([callee]) => [callee, environmentGetterCallee(callee)])).toStrictEqual(cases);
  });
});

describe("receiptEvidenceLevel", () => {
  const derived = (scope: string): ClaimBinding =>
    ({ claim_key: "c", binding: "derived", scope }) as ClaimBinding;
  test("a proof derives at least one claim from the code", () => {
    expect([
      receiptEvidenceLevel("tested", [derived("code")]),
      receiptEvidenceLevel("proved", undefined),
      receiptEvidenceLevel("proved", []),
      receiptEvidenceLevel("proved", [derived("intent")]),
      receiptEvidenceLevel("proved", [
        { claim_key: "d", binding: "attested", scope: "code" } as ClaimBinding,
      ]),
      receiptEvidenceLevel("proved", [
        derived("intent"),
        { claim_key: "d", binding: "attested", scope: "code" } as ClaimBinding,
        derived("code"),
      ]),
    ]).toStrictEqual(["tested", "proved", "proved", "tested", "tested", "proved"]);
  });
});

describe("judgeClaimBindings", () => {
  test("a contract without claims or kind has no bindings", async () => {
    const { ctx, goals } = harness([]);
    for (const contract of [{ kind: "rule" }, { kind: "rule", proves: [] }, { proves: ["c"] }])
      expect(
        await judgeClaimBindings(ctx, {
          testId: "T",
          contract: contract as unknown as ProofContract,
          verdict: proved({}),
          coveredBySymbols: [],
        }),
      ).toBeUndefined();
    expect(goals).toStrictEqual([]);
  });

  test("rejects every claim without a Prolog runtime", async () => {
    expect(
      await judgeClaimBindings({ workspaceRoot: workspace.root } as never, {
        testId: "T",
        contract: { kind: "rule", proves: ["a", "b"] } as unknown as ProofContract,
        verdict: proved({}),
        coveredBySymbols: [],
      }),
    ).toStrictEqual(
      ["a", "b"].map((key) => ({
        claim_key: key,
        binding: "rejected",
        reason: "no Prolog runtime is attached to resolve the claim",
      })),
    );
  });

  test("labels a failed obligations query", async () => {
    expect(judge([], { kind: "rule" }, { obligationsFail: true })).rejects.toThrow(
      "Claim obligations query failed: down",
    );
  });

  test("rejects unresolved and incompatible claims and attests attested ones", async () => {
    expect(
      await judge(
        [
          { claim_key: "a", result: "unresolved", reason: "no fact" },
          { claim_key: "b", result: "incompatible" },
          { claim_key: "c", requirement_id: "", fact_id: "", result: "attested" },
        ],
        { kind: "rule" },
      ),
    ).toStrictEqual([
      { claim_key: "a", binding: "rejected", reason: "no fact" },
      {
        claim_key: "b",
        binding: "rejected",
        reason: "the claim cannot be proved by this certificate",
      },
      { claim_key: "c", binding: "attested", scope: "code" },
    ]);
  });

  const numeric = obligation({
    kind: "numeric_constraint",
    variable: "x",
    value_type: "int",
    operator: "lte",
    value: 5,
  });
  const matching = proved({ variable: "x", value_type: "int", claim: { operator: "lte", value: 5 } });

  test("a numeric claim is about the code only when every value source is", async () => {
    const scope = (valueSource: unknown, coveredBy: string[] = []) =>
      reasonOf([numeric], { kind: "arithmetic", value_source: valueSource }, {
        verdict: matching,
        coveredBy,
      });
    expect([
      await scope(undefined),
      await scope([]),
      await scope([{ symbol_id: "V1" }]),
      await scope([{ symbol_id: "V1" }], ["V1"]),
      await scope([{ symbol_id: "V1" }, { symbol_id: "V2" }], ["V1"]),
      await scope([{ source: { reader: "glob" } }, { symbol_id: "V1" }], ["V1"]),
    ]).toStrictEqual([
      ["derived intent"],
      ["derived intent"],
      ["derived intent"],
      ["derived code"],
      ["derived intent"],
      ["derived code"],
    ]);
  });

  test("a rule decided by a harness is bound with scope harness", async () => {
    const holds = obligation({ kind: "rule_holds" });
    const scope = (contract: Row) => reasonOf([holds], contract, { coveredBy: ["P", "Q", "H"] });
    expect([
      await scope({ kind: "rule" }),
      await scope({ kind: "rule", predicate_source: { p: { symbol_id: "P", harness_for: [] } } }),
      await scope({ kind: "rule", predicate_source: { p: { symbol_id: "P" } } }),
      await scope({
        kind: "rule",
        predicate_source: { p: { symbol_id: "P" }, q: { symbol_id: "Q", harness_for: ["H"] } },
      }),
      await scope({
        kind: "exhaustive",
        predicate_source: { q: { symbol_id: "Q", harness_for: ["H"] } },
      }),
    ]).toStrictEqual([
      ["derived code"],
      ["derived code"],
      ["derived code"],
      ["derived harness"],
      ["derived code"],
    ]);
  });

  test("a certificate that did not re-check rejects every claim", async () => {
    const tested = (certificate?: Row, rejection?: string): CertificateVerdict => ({
      kind: "rule",
      evidence_level: "tested",
      ...(certificate === undefined ? {} : { certificate }),
      ...(rejection === undefined ? {} : { certificate_rejection: rejection }),
    });
    const set = obligation({ kind: "set_equals", members: ["a"] });
    expect(
      await judge([set], { kind: "exhaustive", domain_source: { symbol_id: "SYM-dom" } }, {
        verdict: tested({}, "bad signature"),
      }),
    ).toStrictEqual([
      {
        claim_key: "c1",
        requirement_id: "REQ-1",
        fact_id: "FACT-1",
        binding: "rejected",
        obligation: { kind: "set_equals", members: ["a"] },
        reason: "the certificate did not re-check: bad signature",
      },
    ]);
    const typecheck = { kind: "typecheck", domain_source: { symbol_id: "SYM-dom" } };
    expect(
      await reasonOf([set], typecheck, { verdict: tested(), coveredBy: ["SYM-dom"] }),
    ).toStrictEqual(["the certificate did not re-check"]);
    expect(witnesses).toStrictEqual([]);
    expect(
      await reasonOf([set], typecheck, { verdict: tested({}), coveredBy: ["SYM-dom"] }),
    ).toStrictEqual([
      "Color as a type is not exactly the fact's set {a} (the certificate did not re-check)",
    ]);
    answers = [() => ({ ok: true, version: "5" })];
    expect(
      await reasonOf([set], typecheck, { verdict: tested({}), coveredBy: ["SYM-dom"] }),
    ).toStrictEqual(["the certificate did not re-check"]);
  });
});
