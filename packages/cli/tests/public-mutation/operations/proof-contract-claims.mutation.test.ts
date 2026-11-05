import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CLAIM_BINDING_SCHEMA_VERSION,
  PROOF_CONTRACT_CLAIMS_RULE,
  collectProofContractClaimViolations,
  proofContractClaimViolations,
  readProofContractClaimIssues,
} from "../../../src/public/operations/proof-contract-claims.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import {
  defaultKbManifest,
  writeKbManifest,
} from "../../../src/utils/kb-manifest.js";

const roots: string[] = [];
let savedKbPl: string | undefined;

beforeEach(() => {
  savedKbPl = process.env.KIBI_KB_PL_PATH;
  process.env.KIBI_KB_PL_PATH = "/core/src/kb.pl";
});

afterEach(() => {
  if (savedKbPl === undefined)
    Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
  else process.env.KIBI_KB_PL_PATH = savedKbPl;
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(schemaVersion?: number): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-proof-claims-"));
  roots.push(root);
  if (schemaVersion !== undefined)
    writeKbManifest(root, { ...defaultKbManifest(), schemaVersion });
  return root;
}

const ISSUES = [
  { test_id: "TEST-a", reason: "names no claims" },
  { test_id: "TEST-b", claim_key: "CLAIM-x", reason: "no fact grounds it" },
];

function prolog(issues: unknown = ISSUES) {
  const goals: string[] = [];
  return {
    goals,
    port: {
      oneShotMode: true,
      async query(goal: string) {
        goals.push(goal);
        return {
          success: true,
          bindings: { JsonString: JSON.stringify(issues) },
        };
      },
      async nextSolution() {
        return null;
      },
      async save() {
        return { success: true, bindings: {} };
      },
    },
  };
}

function context(extra: Record<string, unknown>): OperationContext {
  return {
    workspaceRoot: workspace(),
    ...extra,
  } as unknown as OperationContext;
}

const EXPECTED_VIOLATIONS = [
  {
    rule: "proof-contract-claims",
    entityId: "TEST-a",
    description: "TEST-a: names no claims",
    suggestion:
      "Add proof_contract.proves to TEST-a with the claim keys (CLAIM-...) of the requirement its certificate establishes; kibi proof explain on the requirement lists its claims.",
    evidence: { testId: "TEST-a", reason: "names no claims" },
  },
  {
    rule: "proof-contract-claims",
    entityId: "TEST-b",
    description: "TEST-b proves CLAIM-x: no fact grounds it",
    suggestion:
      "Name a modeled claim of a requirement TEST-b reaches through its scenarios, grounded by a fact this proof kind can express (a set fact for exhaustive or typecheck, a numeric fact for arithmetic or smt, a rule, predicate or set fact for rule or state_machine, a string fact for regex), or remove CLAIM-x from proves.",
    evidence: {
      testId: "TEST-b",
      claimKey: "CLAIM-x",
      reason: "no fact grounds it",
    },
  },
];

describe("proof-contract-claims constants", () => {
  test("pin the rule and schema version", () => {
    expect(PROOF_CONTRACT_CLAIMS_RULE).toBe("proof-contract-claims");
    expect(CLAIM_BINDING_SCHEMA_VERSION).toBe(12);
  });
});

describe("readProofContractClaimIssues", () => {
  test("queries the claim obligations module", async () => {
    const { goals, port } = prolog();
    expect(
      await readProofContractClaimIssues(context({ prolog: port })),
    ).toStrictEqual(ISSUES);
    expect(goals).toStrictEqual([
      "(use_module('/core/src/claim_obligations.pl'), claim_obligations:proof_contract_claim_issues_json(JsonString))",
    ]);
  });

  test("starts Prolog on demand", async () => {
    const { port } = prolog();
    expect(
      await readProofContractClaimIssues(
        context({ ensureProlog: async () => port }),
      ),
    ).toStrictEqual(ISSUES);
  });

  test("returns nothing without any Prolog", async () => {
    expect(await readProofContractClaimIssues(context({}))).toStrictEqual([]);
    expect(
      await readProofContractClaimIssues(
        context({ ensureProlog: async () => undefined }),
      ),
    ).toStrictEqual([]);
  });

  test("labels query failures", async () => {
    const failing = {
      oneShotMode: true,
      async query() {
        return { success: false, bindings: {}, error: "nope" };
      },
    };
    await expect(
      readProofContractClaimIssues(context({ prolog: failing })),
    ).rejects.toThrow(new Error("Proof contract claims query failed: nope"));
  });
});

describe("proofContractClaimViolations", () => {
  test("builds one violation per issue", () => {
    expect(proofContractClaimViolations(ISSUES)).toStrictEqual(
      EXPECTED_VIOLATIONS,
    );
  });
});

describe("collectProofContractClaimViolations", () => {
  const RULES = new Set([PROOF_CONTRACT_CLAIMS_RULE]);

  test("reports issues from schema 12", async () => {
    const { port } = prolog();
    expect(
      await collectProofContractClaimViolations(
        {
          workspaceRoot: workspace(12),
          prolog: port,
        } as unknown as OperationContext,
        RULES,
      ),
    ).toStrictEqual(EXPECTED_VIOLATIONS);
  });

  test("skips older or unknown schemas", async () => {
    for (const root of [workspace(11), workspace()]) {
      const { goals, port } = prolog();
      expect(
        await collectProofContractClaimViolations(
          { workspaceRoot: root, prolog: port } as unknown as OperationContext,
          RULES,
        ),
      ).toStrictEqual([]);
      expect(goals).toStrictEqual([]);
    }
  });

  test("skips when the rule is not selected or Prolog is not open", async () => {
    const { goals, port } = prolog();
    const root = workspace(12);
    expect(
      await collectProofContractClaimViolations(
        { workspaceRoot: root, prolog: port } as unknown as OperationContext,
        new Set(["other"]),
      ),
    ).toStrictEqual([]);
    expect(
      await collectProofContractClaimViolations(
        {
          workspaceRoot: root,
          ensureProlog: async () => port,
        } as unknown as OperationContext,
        RULES,
      ),
    ).toStrictEqual([]);
    expect(goals).toStrictEqual([]);
  });
});
