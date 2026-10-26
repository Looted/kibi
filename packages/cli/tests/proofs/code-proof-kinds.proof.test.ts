import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  checkCodeCertificate,
  rerunSmtQuery,
} from "../../src/operations/proof/code-certificates.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import {
  type CodeCertificate,
  arithmeticCertificate,
  certificateDigest,
  exhaustiveCertificate,
  failedMembers,
  regexCertificate,
  ruleCertificate,
  smtCertificate,
  stateMachineCertificate,
  writeCodeCertificate,
} from "../../src/public/proof-certificates.js";
import {
  PROOF_KINDS,
  type ProofContract,
  type ProofKind,
  isCertificateProofKind,
} from "../../src/public/proof-protocol.js";
import { prologCases } from "./prolog-cases.js";

// implements REQ-kibi-code-proof-kinds

const TEST_ID = "TEST-KIND";
const SHA = "a".repeat(64);
const z3Available =
  spawnSync("z3", ["--version"], { encoding: "utf8" }).status === 0;

/** A certificate of each certificate kind that must re-check, and tamperings that must not. */
async function certificates(kind: ProofKind): Promise<{
  valid: CodeCertificate;
  tampered: Record<string, CodeCertificate>;
}> {
  switch (kind) {
    case "exhaustive": {
      const valid = await exhaustiveCertificate({
        testId: TEST_ID,
        domain: { symbolId: "SYM-DOMAIN", members: ["a", "b", "c"] },
        check: () => {},
      });
      const results = valid.results as { member: string; outcome: string }[];
      return {
        valid,
        tampered: {
          "a failed member": {
            ...valid,
            results: results.map((row, index) =>
              index === 1 ? { ...row, outcome: "failed" } : row,
            ),
          },
          "an unchecked member": { ...valid, results: results.slice(0, 2) },
          "a member listed twice": {
            ...valid,
            domain: { symbol_id: "SYM-DOMAIN", members: ["a", "b", "c", "c"] },
          },
          "an empty domain": {
            ...valid,
            domain: { symbol_id: "SYM-DOMAIN", members: [] },
            results: [],
          },
        },
      };
    }
    case "typecheck": {
      const valid: CodeCertificate = {
        version: "kibi.code-certificate.v1",
        kind: "typecheck",
        test_id: TEST_ID,
        domain: { symbol_id: "SYM-DOMAIN" },
        witness: { path: "src/witness.ts", sha256: SHA },
        compiler: { name: "tsc", version: "5.9.3" },
        outcome: "passed",
      };
      return {
        valid,
        tampered: {
          "a rejected witness": { ...valid, outcome: "failed" },
          "a witness without its hash": {
            ...valid,
            witness: { path: "src/witness.ts", sha256: "abc" },
          },
          "no compiler": { ...valid, compiler: { name: "tsc", version: "" } },
        },
      };
    }
    case "arithmetic": {
      const valid = arithmeticCertificate({
        testId: TEST_ID,
        variable: "age_seconds",
        valueType: "int",
        assumptions: [
          { operator: "gte", value: 0 },
          { operator: "lte", value: 604800 },
        ],
        claim: { operator: "lt", value: 604801 },
      });
      return {
        valid,
        tampered: {
          "a claim the assumptions do not entail": {
            ...valid,
            claim: { operator: "lt", value: 604800 },
          },
          "assumptions no value satisfies": {
            ...valid,
            assumptions: [
              { operator: "gt", value: 5 },
              { operator: "lt", value: 5 },
            ],
          },
          "an integer gap only reals cross": {
            ...valid,
            assumptions: [
              { operator: "gt", value: 4 },
              { operator: "lt", value: 5 },
            ],
          },
        },
      };
    }
    case "smt": {
      const valid = smtCertificate({
        testId: TEST_ID,
        solver: { name: "z3", version: "4" },
        query:
          "(declare-const x Int)(assert (and (>= x 0) (<= x 3)))(assert (not (>= (- 3 x) 0)))(check-sat)",
        result: "unsat",
      });
      return {
        valid,
        tampered: {
          "a satisfiable answer": { ...valid, result: "sat" },
          "a query that never asks": {
            ...valid,
            query: "(declare-const x Int)(assert (> x 0))",
          },
        },
      };
    }
    case "rule": {
      const valid = await ruleCertificate({
        testId: TEST_ID,
        domains: { role: { symbolId: "SYM-ROLES", members: ["viewer", "owner"] } },
        predicates: {
          can_edit: {
            symbolId: "SYM-CAN-EDIT",
            argTypes: ["role"],
            decide: (role: string) => role === "owner",
          },
        },
      });
      const predicates = valid.predicates as Record<string, Record<string, unknown>>;
      const table = predicates.can_edit ?? {};
      const rows = table.rows as unknown[];
      return {
        valid,
        tampered: {
          "a missing combination": {
            ...valid,
            predicates: { can_edit: { ...table, rows: rows.slice(0, 1) } },
          },
          "a call that threw": {
            ...valid,
            predicates: {
              can_edit: {
                ...table,
                rows: [rows[0], { args: ["owner"], error: "boom" }],
              },
            },
          },
          "a value outside the domain": {
            ...valid,
            predicates: {
              can_edit: {
                ...table,
                rows: [rows[0], { args: ["admin"], value: true }],
              },
            },
          },
        },
      };
    }
    case "state_machine": {
      const valid = await stateMachineCertificate({
        testId: TEST_ID,
        symbolId: "SYM-MACHINE",
        transitions: { draft: ["sent"], sent: ["paid"], paid: [] },
        initial: "draft",
      });
      const machine = valid.machine as Record<string, unknown>;
      return {
        valid,
        tampered: {
          "an edge to an unknown state": {
            ...valid,
            machine: { ...machine, transitions: [["draft", "lost"]] },
          },
          "an edge listed twice": {
            ...valid,
            machine: {
              ...machine,
              transitions: [
                ["draft", "sent"],
                ["draft", "sent"],
              ],
            },
          },
          "no states": { ...valid, machine: { ...machine, states: [] } },
        },
      };
    }
    case "regex": {
      const valid = regexCertificate({
        testId: TEST_ID,
        symbolId: "SYM-PATTERN",
        value: /^INV-\d{6}$/,
      });
      const pattern = valid.pattern as Record<string, unknown>;
      return {
        valid,
        tampered: {
          "an unknown flavor": {
            ...valid,
            pattern: { ...pattern, flavor: "perl" },
          },
          "a pattern without a symbol": {
            ...valid,
            pattern: { ...pattern, symbol_id: "" },
          },
        },
      };
    }
    default:
      throw new Error(`${kind} issues no certificate`);
  }
}

type Checked = Readonly<{
  ok?: boolean;
  reason?: string;
  digest?: string;
  error?: string;
}>;

const GOAL = `
  code_certificates:code_certificate_check(Case, Result),
  code_certificates:code_certificate_digest(Case, Digest),
  ( Result == ok -> Out = _{ok: true, digest: Digest}
  ; Result = rejected(Reason), Out = _{ok: false, reason: Reason, digest: Digest} )
`;

function contract(kind: ProofKind): ProofContract {
  return {
    version: "kibi.proof-contract.v1",
    integration: "self-proof",
    required_proofs: [{ symbol_id: "SYM-PROOF", target: "default" }],
    success_policy: "all_required_first_attempt",
    kind,
  };
}

/** Every proof kind supports exactly its evidence level: runner kinds tested, certificate kinds proved only on a certificate that re-checks: the exhaustive certificate. */
async function codeProofKindsCertificate(): Promise<CodeCertificate> {
  const context = { workspaceRoot: process.cwd() } as OperationContext;
  return exhaustiveCertificate({
    testId: "TEST-kibi-code-proof-kinds-exhaustive",
    domain: { symbolId: "SYM-proof-kinds", members: PROOF_KINDS },
    async check(kind) {
      if (!isCertificateProofKind(kind)) {
        const verdict = await checkCodeCertificate(context, {
          testId: TEST_ID,
          contract: contract(kind),
          outcome: "passed",
          certificate: undefined,
        });
        if (
          verdict.evidence_level !== "tested" ||
          verdict.certificate !== undefined
        )
          throw new Error(`a ${kind} run earned ${JSON.stringify(verdict)}`);
        return;
      }
      const missing = await checkCodeCertificate(context, {
        testId: TEST_ID,
        contract: contract(kind),
        outcome: "passed",
        certificate: undefined,
      });
      if (missing.evidence_level !== "tested" || !missing.certificate_rejection)
        throw new Error("a run without a certificate earned proved");
      const { valid, tampered } = await certificates(kind);
      const names = Object.keys(tampered);
      const answers = prologCases<Checked>("code_certificates.pl", GOAL, [
        valid,
        ...names.map((name) => tampered[name]),
      ]);
      const [accepted, ...rejected] = answers;
      if (accepted?.ok !== true)
        throw new Error(
          `the valid certificate was rejected: ${accepted?.reason ?? accepted?.error}`,
        );
      if (accepted.digest !== certificateDigest(valid))
        throw new Error("the Prolog digest differs from the receipt digest");
      rejected.forEach((answer, index) => {
        if (answer?.ok !== false)
          throw new Error(`a certificate with ${names[index]} re-checked`);
      });
      if (kind === "smt" && z3Available) {
        if (!rerunSmtQuery("z3", String(valid.query)).ok)
          throw new Error("z3 does not answer unsat on the valid query");
        if (
          rerunSmtQuery(
            "z3",
            "(declare-const x Int)(assert (> x 0))(check-sat)",
          ).ok
        )
          throw new Error("a satisfiable query re-ran as unsat");
      }
    },
  });
}

describe("code proof kinds, proved by exhaustion", () => {
  test("every proof kind supports exactly its evidence level: runner kinds tested, certificate kinds proved only on a certificate that re-checks", async () => {
    const certificate = await codeProofKindsCertificate();
    writeCodeCertificate(certificate);
    expect(failedMembers(certificate)).toEqual([]);
  });
});
