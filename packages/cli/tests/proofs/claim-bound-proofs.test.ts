import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  claimReviewInstruction,
  planProofContractClaimPins,
  withProofContractProves,
} from "../../src/operations/migration/proof-contract-claims.js";
import { setEqualityWitness } from "../../src/operations/proof/claim-bindings.js";
import { compileWitness } from "../../src/operations/proof/code-certificates.js";
import { proofContractClaimViolations } from "../../src/public/operations/proof-contract-claims.js";
import { proofContractErrors } from "../../src/public/proof-protocol.js";

// implements REQ-kibi-claim-bound-proofs

const repoRoot = path.resolve(import.meta.dir, "../../../..");
const scratch = mkdtempSync(path.join(import.meta.dir, ".claim-witness-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const contract = (extra: Record<string, unknown>) => ({
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-TEST", target: "default" }],
  success_policy: "all_required_first_attempt",
  ...extra,
});

describe("proof_contract.proves and value_source", () => {
  test("a certificate contract names distinct claim keys in proves", () => {
    const exhaustive = {
      kind: "exhaustive",
      domain_source: { symbol_id: "SYM-DOMAIN" },
    };
    expect(
      proofContractErrors(
        contract({ ...exhaustive, proves: ["CLAIM-ABC123"] }),
      ),
    ).toEqual([]);
    for (const proves of [[], ["REQ-1"], ["CLAIM-A", "CLAIM-A"], "CLAIM-A"])
      expect(
        proofContractErrors(contract({ ...exhaustive, proves })).join("\n"),
      ).toContain("proof_contract.proves must be");
    expect(
      proofContractErrors(contract({ proves: ["CLAIM-A"] })).join("\n"),
    ).toContain("applies only to certificate kinds");
  });

  test("value_source stands in for constraint_source on arithmetic and smt only", () => {
    const valueSource = [{ symbol_id: "SYM-LIMIT", export: "LIMIT" }];
    expect(
      proofContractErrors(
        contract({ kind: "arithmetic", value_source: valueSource }),
      ),
    ).toEqual([]);
    expect(proofContractErrors(contract({ kind: "smt" })).join("\n")).toContain(
      "constraint_source or value_source is required",
    );
    expect(
      proofContractErrors(
        contract({
          kind: "exhaustive",
          domain_source: { symbol_id: "SYM-DOMAIN" },
          value_source: valueSource,
        }),
      ).join("\n"),
    ).toContain("applies only to kind arithmetic or smt");
    expect(
      proofContractErrors(
        contract({ kind: "arithmetic", value_source: [{ export: "LIMIT" }] }),
      ).join("\n"),
    ).toContain("proof_contract.value_source must be");
  });
});

describe("typecheck claim bindings", () => {
  const domainPath = path.join(scratch, "colors.ts");
  writeFileSync(
    domainPath,
    [
      'export const COLORS = ["red", "green", "blue"] as const;',
      'export type Color = "red" | "green" | "blue";',
      "",
    ].join("\n"),
  );
  const compile = (membersType: string, members: readonly string[]) => {
    const witness = path.join(scratch, `witness-${Math.random()}.ts`);
    writeFileSync(
      witness,
      setEqualityWitness("./colors.js", members, membersType),
    );
    return compileWitness(repoRoot, path.relative(repoRoot, witness));
  };

  test("the witness compiles only when the domain type is exactly the fact's set", () => {
    expect(compile("domain.Color", ["blue", "green", "red"]).ok).toBe(true);
    expect(
      compile("(typeof domain.COLORS)[number]", ["blue", "green", "red"]).ok,
    ).toBe(true);
    // A missing member and an extra member both fail.
    expect(compile("domain.Color", ["green", "red"]).ok).toBe(false);
    expect(compile("domain.Color", ["blue", "green", "red", "cyan"]).ok).toBe(
      false,
    );
  });
});

describe("proof-contract-claims", () => {
  test("names the contract and, when present, the claim it cannot prove", () => {
    const violations = proofContractClaimViolations([
      {
        test_id: "TEST-A",
        reason: "the exhaustive proof contract names no claims in proves",
      },
      {
        test_id: "TEST-B",
        claim_key: "CLAIM-X",
        reason:
          "FACT-X is a set fact, which an arithmetic certificate cannot express",
      },
    ]);
    expect(violations.map((row) => row.rule)).toEqual([
      "proof-contract-claims",
      "proof-contract-claims",
    ]);
    expect(violations[0]?.suggestion).toContain("Add proof_contract.proves");
    expect(violations[1]?.description).toContain("TEST-B proves CLAIM-X");
    expect(violations[1]?.evidence).toMatchObject({ claimKey: "CLAIM-X" });
  });
});

describe("schema 12 migration", () => {
  const document = [
    "---",
    "title: Colors",
    "proof_contract:",
    "  version: kibi.proof-contract.v1",
    "  kind: exhaustive",
    "  domain_source:",
    "    symbol_id: SYM-COLORS",
    "id: TEST-COLORS",
    "type: test",
    "---",
    "Body stays.",
    "",
  ].join("\n");

  test("pins proves inside the proof_contract block and nowhere else", () => {
    const after = withProofContractProves(document, ["CLAIM-ABC"]);
    expect(after).toContain(
      "    symbol_id: SYM-COLORS\n  proves:\n    - CLAIM-ABC\nid: TEST-COLORS",
    );
    expect(after?.endsWith("---\nBody stays.\n")).toBe(true);
  });

  test("leaves a contract that already names proves, or a flow mapping, alone", () => {
    const pinned = withProofContractProves(document, ["CLAIM-ABC"]) ?? "";
    expect(withProofContractProves(pinned, ["CLAIM-DEF"])).toBeNull();
    expect(
      withProofContractProves(
        "---\nproof_contract: {kind: exhaustive}\nid: T\n---\n",
        ["CLAIM-ABC"],
      ),
    ).toBeNull();
  });
});

describe("schema 12 claim review", () => {
  const workspace = path.join(scratch, "review-workspace");
  mkdirSync(path.join(workspace, ".kb", "tests"), { recursive: true });
  const testDocument = (id: string) =>
    [
      "---",
      `id: ${id}`,
      "title: Colors",
      "proof_contract:",
      "  version: kibi.proof-contract.v1",
      "  kind: exhaustive",
      "  domain_source:",
      "    symbol_id: SYM-COLORS",
      "type: test",
      "---",
      "Body.",
      "",
    ].join("\n");
  for (const id of ["TEST-PIN", "TEST-ATTESTED"])
    writeFileSync(
      path.join(workspace, ".kb", "tests", `${id}.md`),
      testDocument(id),
    );
  const claim = (key: string, binding: "derived" | "attested") => ({
    claim_key: key,
    requirement_id: "REQ-COLORS",
    fact_id: `FACT-${key}`,
    binding,
  });

  test("pins the one derived claim and lists every reached claim for review", () => {
    const plan = planProofContractClaimPins(workspace, [
      {
        test_id: "TEST-PIN",
        kind: "exhaustive",
        candidates: [
          claim("CLAIM-SET", "derived"),
          claim("CLAIM-RENDERS", "attested"),
        ],
      },
      {
        test_id: "TEST-ATTESTED",
        kind: "exhaustive",
        candidates: [claim("CLAIM-RENDERS", "attested")],
      },
    ]);
    expect(plan.targets.map((target) => target.id)).toEqual(["TEST-PIN"]);
    expect(plan.targets[0]?.after).toContain("  proves:\n    - CLAIM-SET\n");
    expect(plan.review.map((row) => row.id)).toEqual(["TEST-ATTESTED"]);
    const [row] = plan.review;
    if (!row) throw new Error("expected a review row");
    const instruction = claimReviewInstruction(row);
    expect(instruction).toContain(
      "CLAIM-RENDERS (REQ-COLORS, FACT-CLAIM-RENDERS): attested only",
    );
    expect(instruction).toContain(
      "model that claim's grounding fact as a set fact",
    );
  });
});
