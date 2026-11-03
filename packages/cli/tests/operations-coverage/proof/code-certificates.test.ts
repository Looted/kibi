import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { chmodSync } from "node:fs";
import path from "node:path";
import {
  checkCodeCertificate,
  compileWitness,
  compiledToSourcePath,
  completeSourceCertificate,
  evaluateDomain,
  rerunSmtQuery,
  smtAssertion,
} from "../../../src/operations/proof/code-certificates.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import { certificateDigest } from "../../../src/public/proof-certificates.js";
import type { ProofContract } from "../../../src/public/proof-protocol.js";
import { type FakeEntity, context, scratch } from "../helpers.js";

// Inside the repository, so a witness compile resolves the repo's TypeScript.
const workspace = scratch(
  {
    "src/limits.ts": [
      "export const LIMIT = 5;",
      "export const HALF = 2.5;",
      'export const ITEMS = ["a", "b", "c"];',
      'export type Color = "red" | "blue";',
      'export const COLORS = ["red", "blue"] as const;',
    ].join("\n"),
    "tests/witness.ts": [
      'import type { Color } from "../src/limits.js";',
      'import { COLORS } from "../src/limits.js";',
      "export function name(color: Color): string {",
      "  switch (color) {",
      '    case "red": return "r";',
      '    case "blue": return "b";',
      "    default: { const never: never = color; return never; }",
      "  }",
      "}",
      "export const all = COLORS;",
    ].join("\n"),
    "tests/bad-witness.ts": [
      'import { COLORS } from "../src/limits";',
      "export const all: number = COLORS;",
    ].join("\n"),
    "routes/a.txt": "a\n",
    "routes/b.txt": "b\n",
    "app/tsconfig.json": [
      "{",
      '  /* block comment */ "compilerOptions": {',
      '    "outDir": "dist", // line comment',
      '    "rootDir": "src",',
      '    "description": "a \\"quoted\\" name",',
      "  },",
      "}",
    ].join("\n"),
    "bin/z3": '#!/bin/sh\ncat >/dev/null\necho "$KIBI_FAKE_Z3"\n',
  },
  ".ops-cov-certs-",
  import.meta.dir,
);
chmodSync(path.join(workspace.root, "bin/z3"), 0o755);
const outside = scratch({ "w.ts": "export const x = 1;\n" });
afterAll(() => {
  workspace.cleanup();
  outside.cleanup();
});

const originalPath = process.env.PATH;
afterEach(() => {
  process.env.PATH = originalPath;
  delete process.env.KIBI_FAKE_Z3;
});
const withFakeZ3 = (answer: string) => {
  process.env.PATH = `${path.join(workspace.root, "bin")}:${originalPath}`;
  process.env.KIBI_FAKE_Z3 = answer;
};

const fact = (id: string, fields: Record<string, unknown> = {}): FakeEntity => ({
  id,
  type: "fact",
  status: "active",
  fact_kind: "property_value",
  polarity: "require",
  subject_key: "api",
  property_key: "limit",
  value_type: "int",
  value_int: 5,
  operator: "lte",
  ...fields,
});
const entities: FakeEntity[] = [
  { id: "SYM-limit", type: "symbol", title: "LIMIT", source_file: "src/limits.ts" },
  { id: "SYM-half", type: "symbol", title: "HALF", source_file: "src/limits.ts" },
  { id: "SYM-items", type: "symbol", title: "ITEMS", source_file: "src/limits.ts" },
  { id: "SYM-colors", type: "symbol", title: "COLORS", source_file: "src/limits.ts" },
  fact("FACT-a"),
  fact("FACT-b", { operator: "gt", value_int: 1, polarity: "" }),
  fact("FACT-real", { value_type: "number", value_number: 2.5, operator: "neq" }),
  fact("FACT-other", { subject_key: "web" }),
  fact("FACT-closed", { status: "superseded" }),
  fact("FACT-forbid", { polarity: "forbid" }),
  fact("FACT-op", { operator: "near" }),
];

/** Answers the certificate check the way code_certificates.pl does. */
function checking(
  verdict: (certificate: Record<string, unknown>) => Record<string, unknown> = (
    certificate,
  ) => ({ accepted: true, digest: certificateDigest(certificate) }),
) {
  return (goal: string) => {
    const match = /code_certificate_check_json\('((?:[^'\\]|\\.|'')*)'/.exec(goal);
    if (match === null) return undefined;
    const json = (match[1] ?? "").replaceAll("''", "'").replaceAll("\\\\", "\\");
    const certificate = JSON.parse(json) as Record<string, unknown>;
    return {
      success: true,
      bindings: { JsonString: JSON.stringify(verdict(certificate)) },
    };
  };
}
const ctx = context(workspace.root, entities, checking());
const contract = (fields: Record<string, unknown>) =>
  fields as unknown as ProofContract;

async function check(
  fields: Record<string, unknown>,
  certificate: Record<string, unknown>,
  options: { outcome?: string; context?: OperationContext } = {},
) {
  return checkCodeCertificate(options.context ?? ctx, {
    testId: "TEST-1",
    contract: contract(fields),
    outcome: options.outcome ?? "passed",
    certificate: { test_id: "TEST-1", kind: fields.kind, ...certificate },
  });
}
const rejection = async (
  fields: Record<string, unknown>,
  certificate: Record<string, unknown>,
) => (await check(fields, certificate)).certificate_rejection;

describe("helpers", () => {
  test("compiledToSourcePath reads a JSONC tsconfig", () => {
    expect(compiledToSourcePath(workspace.root, "app/dist/a.js")).toBe(
      path.join("app", "src", "a.js"),
    );
  });

  test("evaluateDomain refuses a number", () => {
    expect(evaluateDomain(workspace.root, "src/limits.ts", "LIMIT")).toStrictEqual({
      ok: false,
      reason: "LIMIT is a number, not a list, set, map or object",
    });
  });

  test("compileWitness names a workspace without TypeScript", () => {
    expect(compileWitness(outside.root, "w.ts")).toStrictEqual({
      ok: false,
      reason:
        "Kibi could not load TypeScript from the workspace to compile the witness (install typescript)",
    });
  });

  test("smtAssertion writes each operator and sign", () => {
    expect(smtAssertion("x", "int", { operator: "neq", value: -3 })).toBe(
      "(assert (distinct x (- 3)))",
    );
    expect(smtAssertion("x", "real", { operator: "lte", value: 2 })).toBe(
      "(assert (<= x 2.0))",
    );
    expect(smtAssertion("x", "real", { operator: "gt", value: 2.5 })).toBe(
      "(assert (> x 2.5))",
    );
  });

  test("rerunSmtQuery needs z3 or cvc5 and an unsat answer", () => {
    expect(rerunSmtQuery("yices", "")).toStrictEqual({
      ok: false,
      reason: "solver yices is not z3 or cvc5",
    });
    process.env.PATH = path.join(workspace.root, "no-such-bin");
    const missing = rerunSmtQuery("cvc5", "(check-sat)");
    expect(missing.ok).toBe(false);
    if (!missing.ok)
      expect(missing.reason).toStartWith("Kibi could not re-run cvc5 on the query: ");
    withFakeZ3("unsat");
    expect(rerunSmtQuery("z3", "(check-sat)")).toStrictEqual({ ok: true });
    withFakeZ3("sat");
    expect(rerunSmtQuery("z3", "(check-sat)")).toStrictEqual({
      ok: false,
      reason: "re-running z3 on the query answered sat, not unsat",
    });
    withFakeZ3("");
    expect(rerunSmtQuery("z3", "(check-sat)")).toStrictEqual({
      ok: false,
      reason: "re-running z3 on the query answered nothing, not unsat",
    });
  });
});

describe("arithmetic certificates", () => {
  const arithmetic = (fields: Record<string, unknown> = {}) => ({
    kind: "arithmetic",
    constraint_source: { fact_ids: ["FACT-a", "FACT-b"] },
    ...fields,
  });
  const good = {
    variable: "limit",
    value_type: "int",
    assumptions: [
      { operator: "lte", value: 5 },
      { operator: "gt", value: 1 },
    ],
  };

  test("proves when the assumptions are the facts' constraints", async () => {
    const verdict = await check(arithmetic(), good);
    expect(verdict.evidence_level).toBe("proved");
    expect(verdict.certificate_rejection).toBeUndefined();
  });

  test("names each mismatch", async () => {
    expect(await rejection({ kind: "arithmetic" }, good)).toBe(
      "the contract names no constraint_source facts or value_source constants, so the arithmetic certificate proves numbers the test chose",
    );
    const { variable: _variable, ...unnamed } = good;
    expect(await rejection(arithmetic(), unnamed)).toBe(
      "the certificate's variable (none) is not the facts' property limit",
    );
    expect(await rejection(arithmetic(), { ...good, value_type: "real" })).toBe(
      "the certificate's value_type real is not the facts' int",
    );
    expect(await rejection(arithmetic(), { ...good, assumptions: "none" })).toBe(
      "the certificate's assumptions are not exactly the constraint_source facts' constraints and value_source values (lte:5, gt:1)",
    );
    expect(
      await rejection(arithmetic(), {
        ...good,
        assumptions: [{ operator: "lte", value: 5 }, null],
      }),
    ).toBe(
      "the certificate's assumptions are not exactly the constraint_source facts' constraints and value_source values (lte:5, gt:1)",
    );
  });

  test("reads real-valued facts and value_source constants", async () => {
    expect(
      await rejection(
        arithmetic({
          constraint_source: { fact_ids: ["FACT-real"] },
          value_source: [{ symbol_id: "SYM-half" }],
        }),
        {
          variable: "limit",
          value_type: "real",
          assumptions: [
            { operator: "neq", value: 2.5 },
            { operator: "eq", value: 2.5 },
          ],
        },
      ),
    ).toBeUndefined();
    // Without facts the variable and value type come from the certificate.
    expect(
      await rejection(
        { kind: "arithmetic", value_source: [{ symbol_id: "SYM-half" }] },
        { variable: "half", value_type: "real", assumptions: [{ operator: "eq", value: 2.5 }] },
      ),
    ).toBeUndefined();
    expect(
      await rejection(
        { kind: "arithmetic", value_source: [{ symbol_id: "SYM-limit" }] },
        { variable: "n", value_type: "real", assumptions: [{ operator: "eq", value: 5 }] },
      ),
    ).toBeUndefined();
    expect(
      await rejection(
        {
          kind: "arithmetic",
          value_source: [
            { source: { reader: "glob", pattern: "routes/*.txt" } },
            { symbol_id: "SYM-items", measure: "count" },
          ],
        },
        {
          variable: "n",
          value_type: "int",
          assumptions: [
            { operator: "eq", value: 2 },
            { operator: "eq", value: 3 },
          ],
        },
      ),
    ).toBeUndefined();
  });

  test("names unusable facts and value sources", async () => {
    const facts = (...ids: string[]) =>
      rejection(arithmetic({ constraint_source: { fact_ids: ids } }), good);
    expect(await facts("FACT-missing")).toBe(
      "constraint_source fact FACT-missing does not exist",
    );
    expect(await facts("FACT-closed")).toBe(
      "constraint_source fact FACT-closed is not active",
    );
    expect(await facts("FACT-forbid")).toBe(
      "constraint_source fact FACT-forbid is not a required property_value fact",
    );
    expect(await facts("FACT-op")).toBe(
      "constraint_source fact FACT-op has no numeric operator and value",
    );
    expect(await facts("FACT-a", "FACT-other")).toBe(
      "the constraint_source facts are about more than one subject and property",
    );
    expect(
      await rejection(
        arithmetic({
          value_source: [{ source: { reader: "json", file: "missing.json" } }],
        }),
        good,
      ),
    ).toStartWith("Kibi could not read the value_source ");
    expect(
      await rejection(
        arithmetic({ value_source: [{ symbol_id: "SYM-missing" }] }),
        good,
      ),
    ).toBe("the value_source symbol SYM-missing has no source file");
    expect(
      await rejection(
        arithmetic({ value_source: [{ symbol_id: "SYM-items" }] }),
        good,
      ),
    ).toBe("ITEMS in src/limits.ts is not a finite number");
    expect(
      await rejection(
        arithmetic({ value_source: [{ symbol_id: "SYM-limit", measure: "count" }] }),
        good,
      ),
    ).toBe("LIMIT is a number, not a list, set, map or object");
  });
});

describe("smt certificates", () => {
  const smt = { kind: "smt", constraint_source: { fact_ids: ["FACT-a"] } };
  const query =
    "(declare-const limit Int)\n(assert (<= limit 5))\n(assert (> limit 5))\n(check-sat)";

  test("re-runs the solver on a query that asserts the facts", async () => {
    withFakeZ3("unsat");
    expect(
      await rejection(smt, { solver: { name: "z3" }, query }),
    ).toBeUndefined();
    withFakeZ3("sat");
    expect(await rejection(smt, { solver: { name: "z3" }, query })).toBe(
      "re-running z3 on the query answered sat, not unsat",
    );
  });

  test("names a query that leaves out the facts", async () => {
    expect(
      await rejection(
        { kind: "smt", value_source: [{ symbol_id: "SYM-limit" }] },
        { query },
      ),
    ).toBe(
      "the smt contract names no constraint_source facts, so Kibi cannot tell which constant the query is about",
    );
    expect(await rejection(smt, { query: "(check-sat)" })).toBe(
      "the query does not declare (declare-const limit Int) for the facts' property",
    );
    expect(
      await rejection(smt, { query: "(declare-const limit Int) (check-sat)" }),
    ).toBe(
      "the query does not assert the constraint_source or value_source constraint (assert (<= limit 5))",
    );
  });
});

describe("typecheck certificates", () => {
  const witnessSha = (relative: string) =>
    createHash("sha256")
      .update(require("node:fs").readFileSync(path.join(workspace.root, relative), "utf8"))
      .digest("hex");
  const typecheck = (witness: string) => ({
    kind: "typecheck",
    domain_source: { symbol_id: "SYM-colors" },
    witness: { path: witness },
  });
  const certificate = (witness: string, sha = witnessSha(witness)) => ({
    domain: { symbol_id: "SYM-colors" },
    witness: { path: witness, sha256: sha },
  });

  test("proves with a witness that compiles and checks exhaustiveness", async () => {
    expect(
      await rejection(typecheck("tests/witness.ts"), certificate("tests/witness.ts")),
    ).toBeUndefined();
  });

  test("names each witness problem", async () => {
    expect(
      await rejection(typecheck("tests/witness.ts"), {
        ...certificate("tests/witness.ts"),
        witness: { path: "other.ts" },
      }),
    ).toBe("the certificate's witness is not the contract's witness tests/witness.ts");
    expect(
      await rejection(
        { ...typecheck("tests/witness.ts"), witness: { path: "tests/gone.ts" } },
        certificate("tests/witness.ts"),
      ),
    ).toBe("the proof does not import COLORS from src/limits.ts, so its domain may be hand-listed (Kibi reads the export named by the symbol's title; set domain_source.export when the export has another name)");
    expect(
      await rejection(typecheck("tests/witness.ts"), certificate("tests/witness.ts", "0")),
    ).toBe("the witness sha256 does not match tests/witness.ts in the workspace");
    expect(
      await rejection(
        typecheck("tests/bad-witness.ts"),
        certificate("tests/bad-witness.ts"),
      ),
    ).toBe(
      "the witness tests/bad-witness.ts has no exhaustiveness check (a never type or a satisfies map), so a new domain member would still compile",
    );
  });
});

describe("source certificates", () => {
  const source = { reader: "glob", pattern: "routes/*.txt" };
  const sourceContract = contract({ kind: "source", source });

  test("completeSourceCertificate checks what the run left", async () => {
    expect(
      await completeSourceCertificate(ctx, "TEST-1", contract({ kind: "source" }), null),
    ).toStrictEqual({ ok: false, reason: "the source contract names no source" });
    expect(
      await completeSourceCertificate(ctx, "TEST-1", sourceContract, "text"),
    ).toStrictEqual({
      ok: false,
      reason: "the run left a source certificate that is not a JSON object",
    });
    expect(
      await completeSourceCertificate(ctx, "TEST-1", sourceContract, {}),
    ).toStrictEqual({
      ok: false,
      reason: "the certificate kind (none) is not the contract kind source",
    });
    expect(
      await completeSourceCertificate(ctx, "TEST-1", sourceContract, {
        kind: "source",
        test_id: "TEST-2",
      }),
    ).toStrictEqual({ ok: false, reason: "the certificate is for TEST-2" });
    expect(
      await completeSourceCertificate(ctx, "TEST-1", sourceContract, {
        kind: "source",
        test_id: "TEST-1",
        source: { reader: "glob", pattern: "other/*" },
      }),
    ).toStrictEqual({
      ok: false,
      reason: `the certificate reads {"reader":"glob","pattern":"other/*"}, not the contract's source`,
    });
    expect(
      await completeSourceCertificate(ctx, "TEST-1", sourceContract, {
        kind: "source",
        test_id: "TEST-1",
        source: "free text",
      }),
    ).toStrictEqual({
      ok: false,
      reason: `the certificate reads "free text", not the contract's source`,
    });
    const missing = await completeSourceCertificate(
      ctx,
      "TEST-1",
      contract({ kind: "source", source: { reader: "json", file: "none.json" } }),
      undefined,
    );
    expect(missing.ok).toBe(false);
    const wrongModel = await completeSourceCertificate(ctx, "TEST-1", sourceContract, {
      kind: "source",
      test_id: "TEST-1",
      source,
      model: { members: ["x"] },
    });
    expect(wrongModel.ok).toBe(false);
    if (!wrongModel.ok)
      expect(wrongModel.reason).toStartWith(
        "the certificate's model is not what Kibi reads from ",
      );
    const empty = scratch();
    try {
      const none = await completeSourceCertificate(
        context(empty.root),
        "TEST-1",
        contract({ kind: "source", source: { reader: "json", file: "a.json", select: "$" } }),
        { kind: "source", test_id: "TEST-1", model: { members: ["x"] } },
      );
      expect(none.ok).toBe(false);
    } finally {
      empty.cleanup();
    }
    const done = await completeSourceCertificate(ctx, "TEST-1", sourceContract, {
      kind: "source",
      test_id: "TEST-1",
      source,
    });
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.certificate.kind).toBe("source");
      expect(done.certificate.test_id).toBe("TEST-1");
      expect(done.certificate.source).toStrictEqual(source);
    }
  });

  test("checkCodeCertificate stores Kibi's own read of a passed source run", async () => {
    const verdict = await checkCodeCertificate(ctx, {
      testId: "TEST-1",
      contract: sourceContract,
      outcome: "passed",
      certificate: undefined,
    });
    expect(verdict.evidence_level).toBe("proved");
    expect(verdict.certificate?.kind).toBe("source");
  });
});

describe("checkCodeCertificate verdicts", () => {
  const arithmetic = {
    kind: "arithmetic",
    constraint_source: { fact_ids: ["FACT-a"] },
  };
  const good = {
    variable: "limit",
    value_type: "int",
    assumptions: [{ operator: "lte", value: 5 }],
  };

  test("rejects a certificate of another kind", async () => {
    expect(
      (
        await checkCodeCertificate(ctx, {
          testId: "TEST-1",
          contract: contract(arithmetic),
          outcome: "passed",
          certificate: { test_id: "TEST-1" },
        })
      ).certificate_rejection,
    ).toBe("the certificate kind (none) is not the contract kind arithmetic");
  });

  test("passes the checker's reason, or a default", async () => {
    const reasons = context(
      workspace.root,
      entities,
      checking(() => ({ accepted: false, reason: "the arithmetic does not hold" })),
    );
    expect(
      (await check(arithmetic, good, { context: reasons })).certificate_rejection,
    ).toBe("the arithmetic does not hold");
    const silent = context(workspace.root, entities, checking(() => ({})));
    expect(
      (await check(arithmetic, good, { context: silent })).certificate_rejection,
    ).toBe("the certificate did not re-check");
  });

  test("rejects a certificate the checker hashes differently", async () => {
    const other = context(
      workspace.root,
      entities,
      checking(() => ({ accepted: true, digest: "different" })),
    );
    expect(
      (await check(arithmetic, good, { context: other })).certificate_rejection,
    ).toBe(
      "the certificate does not hash the same in the CLI and in code_certificates.pl (write non-integer numbers as strings)",
    );
  });
});
