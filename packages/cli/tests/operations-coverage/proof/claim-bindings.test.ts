import { afterAll, describe, expect, test } from "bun:test";
import { judgeClaimBindings } from "../../../src/operations/proof/claim-bindings.js";
import type { CertificateVerdict } from "../../../src/operations/proof/code-certificates.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import type { ProofContract } from "../../../src/public/proof-protocol.js";
import { type FakeEntity, context, scratch } from "../helpers.js";

// Inside the repository, so the witnesses compile with the repo's TypeScript.
const workspace = scratch(
  {
    "src/domain.ts": [
      'export type Color = "red" | "blue";',
      'export const SIZES = ["s", "m"] as const;',
      "export interface User { id: string; name?: string; email: string | null }",
      "export class Account { id = 1; }",
      "export const LIMIT = 5;",
    ].join("\n"),
  },
  ".ops-cov-claims-",
  import.meta.dir,
);
afterAll(() => workspace.cleanup());

const entities: FakeEntity[] = [
  { id: "SYM-color", type: "symbol", title: "Color", source_file: "src/domain.ts" },
  { id: "SYM-sizes", type: "symbol", title: "SIZES", source_file: "src/domain.ts" },
  { id: "SYM-user", type: "symbol", title: "User", source_file: "src/domain.ts" },
  { id: "SYM-account", type: "symbol", title: "Account", source_file: "src/domain.ts" },
  { id: "SYM-limit", type: "symbol", title: "LIMIT", source_file: "src/domain.ts" },
];

type Row = Record<string, unknown>;
function claimContext(rows: Row[], modelCheck: Row = { ok: true }): OperationContext {
  return context(workspace.root, entities, (goal) => {
    if (goal.includes("test_claim_obligations_json"))
      return { success: true, bindings: { JsonString: JSON.stringify(rows) } };
    if (goal.includes("claim_model_check_json"))
      return { success: true, bindings: { JsonString: JSON.stringify(modelCheck) } };
    return undefined;
  });
}
const contract = (fields: Record<string, unknown>) =>
  ({ proves: ["c1"], ...fields }) as unknown as ProofContract;
const proved = (certificate: Row = {}): CertificateVerdict => ({
  kind: "rule",
  evidence_level: "proved",
  certificate,
});
const obligation = (fields: Row): Row => ({
  claim_key: "c1",
  requirement_id: "REQ-1",
  fact_id: "FACT-1",
  result: "obligation",
  obligation: fields,
});

async function judge(
  rows: Row[],
  fields: Record<string, unknown>,
  options: {
    verdict?: CertificateVerdict;
    coveredBy?: string[];
    modelCheck?: Row;
  } = {},
) {
  return judgeClaimBindings(claimContext(rows, options.modelCheck), {
    testId: "TEST-1",
    contract: contract(fields),
    verdict: options.verdict ?? proved(),
    coveredBySymbols: options.coveredBy ?? [],
  });
}
const reasons = async (...args: Parameters<typeof judge>) =>
  (await judge(...args))?.map((row) => row.reason ?? row.binding);

describe("judgeClaimBindings", () => {
  test("rejects every claim without a Prolog runtime", async () => {
    expect(
      await judgeClaimBindings({ workspaceRoot: workspace.root } as OperationContext, {
        testId: "TEST-1",
        contract: contract({ kind: "rule" }),
        verdict: proved(),
        coveredBySymbols: [],
      }),
    ).toStrictEqual([
      {
        claim_key: "c1",
        binding: "rejected",
        reason: "no Prolog runtime is attached to resolve the claim",
      },
    ]);
  });

  test("model checks non-numeric obligations in Prolog", async () => {
    const rule = {
      kind: "rule",
      domains: {
        Role: { symbol_id: "SYM-sizes" },
        Route: { source: { reader: "glob", pattern: "*" } },
      },
      predicate_source: {
        can: { symbol_id: "SYM-color", harness_for: ["SYM-limit"] },
      },
    };
    const covered = ["SYM-sizes", "SYM-color", "SYM-limit"];
    expect(
      await judge([obligation({ kind: "rule_holds" })], rule, { coveredBy: covered }),
    ).toStrictEqual([
      {
        claim_key: "c1",
        requirement_id: "REQ-1",
        fact_id: "FACT-1",
        binding: "derived",
        scope: "harness",
        obligation: { kind: "rule_holds" },
      },
    ]);
    expect(
      await reasons([obligation({ kind: "rule_holds" })], rule, {
        coveredBy: covered,
        modelCheck: { ok: false, reason: "can(s) is false" },
      }),
    ).toStrictEqual(["can(s) is false"]);
    expect(
      await reasons([obligation({ kind: "rule_holds" })], rule, {
        coveredBy: covered,
        modelCheck: {},
      }),
    ).toStrictEqual(["the model check failed"]);
    expect(
      await reasons([obligation({ kind: "rule_holds" })], rule, {
        coveredBy: ["SYM-sizes"],
      }),
    ).toStrictEqual([
      "the symbol SYM-color the certificate read is not in the receipt's code scope: link it covered_by the test so a change to it stales the proof",
    ]);
  });

  test("scopes numeric claims by whether the value comes from the code", async () => {
    const numeric = {
      kind: "numeric_constraint",
      variable: "limit",
      value_type: "int",
      operator: "lte",
      value: 5,
    };
    const certificate = {
      variable: "limit",
      value_type: "int",
      claim: { operator: "lte", value: 5 },
    };
    const sourced = await judge(
      [obligation(numeric)],
      {
        kind: "arithmetic",
        value_source: [{ source: { reader: "glob", pattern: "*" } }, { symbol_id: "SYM-limit" }],
      },
      { verdict: proved(certificate), coveredBy: ["SYM-limit"] },
    );
    expect(sourced?.[0]?.scope).toBe("code");
    const intent = await judge([obligation(numeric)], { kind: "arithmetic" }, {
      verdict: proved(certificate),
    });
    expect(intent?.[0]?.scope).toBe("intent");
    for (const changed of [
      { variable: "other" },
      { value_type: "real" },
      { claim: { operator: "lt", value: 5 } },
      { claim: { operator: "lte", value: 6 } },
      { claim: undefined },
    ])
      expect(
        await reasons([obligation(numeric)], { kind: "arithmetic" }, {
          verdict: proved({ ...certificate, ...changed }),
        }),
      ).toStrictEqual([
        "the certificate's claim is not FACT-1's constraint (limit lte 5)",
      ]);
    expect(
      await reasons([{ ...obligation(numeric), fact_id: undefined }], { kind: "smt" }, {
        verdict: proved({ query: "(assert (<= limit 5))" }),
      }),
    ).toStrictEqual([
      "the query does not assert the negation of the grounding fact's constraint (assert (not (<= limit 5)))",
    ]);
    expect(
      await reasons([obligation(numeric)], { kind: "smt" }, {
        verdict: proved({ query: "(assert\n  (not (<= limit 5)))" }),
      }),
    ).toStrictEqual(["derived"]);
  });

  test("checks a typecheck set claim against the domain type", async () => {
    const typecheck = (symbol: string) => ({
      kind: "typecheck",
      domain_source: { symbol_id: symbol },
    });
    const set = (members: string[]) => obligation({ kind: "set_equals", members });
    expect(
      await reasons([set(["red", "blue"])], typecheck("SYM-color"), {
        coveredBy: ["SYM-color"],
      }),
    ).toStrictEqual(["derived"]);
    expect(
      await reasons([set(["s", "m"])], typecheck("SYM-sizes"), {
        coveredBy: ["SYM-sizes"],
      }),
    ).toStrictEqual(["derived"]);
    const [wrong] =
      (await reasons([set(["red"])], typecheck("SYM-color"), {
        coveredBy: ["SYM-color"],
      })) ?? [];
    expect(wrong).toStartWith(
      "Color as a type is not exactly the fact's set {red} (TypeScript ",
    );
    expect(wrong).toContain(" rejects the set-equality witness: ");
    expect(
      await reasons([set(["x"])], typecheck("SYM-gone"), {
        coveredBy: ["SYM-gone"],
      }),
    ).toStrictEqual(["the domain_source symbol SYM-gone has no source file"]);
  });

  test("checks required fields against the domain type", async () => {
    const typecheck = (symbol: string) => ({
      kind: "typecheck",
      domain_source: { symbol_id: symbol },
    });
    const fields = (members: unknown) =>
      obligation({ kind: "required_fields", members });
    expect(
      await reasons([fields(["id"])], typecheck("SYM-user"), {
        coveredBy: ["SYM-user"],
      }),
    ).toStrictEqual(["derived"]);
    expect(
      await reasons([fields(["id"])], typecheck("SYM-account"), {
        coveredBy: ["SYM-account"],
      }),
    ).toStrictEqual(["derived"]);
    const [broken] =
      (await reasons([fields(["id", "name", "email"])], typecheck("SYM-user"), {
        coveredBy: ["SYM-user"],
      })) ?? [];
    expect(broken).toStartWith(
      "User does not have every field of {id, name, email} as a required, non-nullable field: ",
    );
    const [unknownType] =
      (await reasons([fields("none")], typecheck("SYM-limit"), {
        coveredBy: ["SYM-limit"],
      })) ?? [];
    expect(unknownType).toStartWith(
      "LIMIT does not have every field of {} as a required, non-nullable field (TypeScript ",
    );
    expect(unknownType).toContain(" rejects the required-fields witness: ");
    expect(
      await reasons([fields(["id"])], typecheck("SYM-gone"), {
        coveredBy: ["SYM-gone"],
      }),
    ).toStrictEqual(["the domain_source symbol SYM-gone has no source file"]);
  });

  test("leads a failed typecheck certificate with what the code breaks", async () => {
    const failed: CertificateVerdict = {
      kind: "typecheck",
      evidence_level: "tested",
      certificate: {},
      certificate_rejection: "the type checker did not accept the witness",
    };
    const contractFields = {
      kind: "typecheck",
      domain_source: { symbol_id: "SYM-color" },
    };
    const set = (members: string[]) => obligation({ kind: "set_equals", members });
    expect(
      await reasons([set(["red", "blue"])], contractFields, {
        verdict: failed,
        coveredBy: ["SYM-color"],
      }),
    ).toStrictEqual([
      "the certificate did not re-check: the type checker did not accept the witness",
    ]);
    const [broken] =
      (await reasons([set(["red"])], contractFields, {
        verdict: { ...failed, certificate_rejection: undefined },
        coveredBy: ["SYM-color"],
      })) ?? [];
    expect(broken).toStartWith("Color as a type is not exactly the fact's set {red} (");
    expect(broken).toEndWith(") (the certificate did not re-check)");
  });
});
