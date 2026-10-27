import { describe, expect, test } from "bun:test";
import {
  judgeClaimBindings,
  receiptEvidenceLevel,
} from "../../src/operations/proof/claim-bindings.js";
import type { CertificateVerdict } from "../../src/operations/proof/code-certificates.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  failedMembers,
  writeCodeCertificate,
} from "../../src/public/proof-certificates.js";
import type { ProofContract } from "../../src/public/proof-protocol.js";
import {
  CLAIM_BINDING_VERDICTS,
  type ClaimBindingVerdict,
} from "../../src/public/proof-receipt.js";

// implements REQ-kibi-claim-bound-proofs

const CLAIM = "CLAIM-0000000000000C01";
const MEMBERS = ["blue", "green", "red"];

const contract: ProofContract = {
  version: "kibi.proof-contract.v1",
  integration: "self-proof",
  required_proofs: [{ symbol_id: "SYM-PROOF", target: "default" }],
  success_policy: "all_required_first_attempt",
  kind: "exhaustive",
  domain_source: { symbol_id: "SYM-COLORS" },
  proves: [CLAIM],
};

/** A context whose Prolog answers the claim obligation rows Kibi derives. */
function contextAnswering(row: Record<string, unknown>): OperationContext {
  return {
    workspaceRoot: process.cwd(),
    prolog: {
      oneShotMode: true,
      query: async () => ({
        success: true,
        bindings: {
          JsonString: JSON.stringify([
            { claim_key: CLAIM, requirement_id: "REQ-COLORS", ...row },
          ]),
        },
      }),
    },
  } as unknown as OperationContext;
}

function proved(members: readonly string[]): CertificateVerdict {
  return {
    kind: "exhaustive",
    evidence_level: "proved",
    certificate: { domain: { symbol_id: "SYM-COLORS", members } },
  } as unknown as CertificateVerdict;
}

const setObligation = {
  result: "obligation",
  fact_id: "FACT-COLORS",
  obligation: { kind: "set_equals", members: MEMBERS },
};

/**
 * The claim inputs that must earn each verdict, and inputs that must not:
 * Kibi derives a binding only when the certificate establishes the claim's
 * own obligation, attests a claim whose fact has no derivation, and rejects
 * everything else.
 */
const CASES: Record<
  ClaimBindingVerdict,
  readonly {
    name: string;
    row: Record<string, unknown>;
    verdict: CertificateVerdict;
    coveredBy: readonly string[];
  }[]
> = {
  derived: [
    {
      name: "the domain is exactly the fact's set",
      row: setObligation,
      verdict: proved(["red", "green", "blue"]),
      coveredBy: ["SYM-COLORS"],
    },
  ],
  attested: [
    {
      name: "the fact has no derivation",
      row: { result: "attested", fact_id: "FACT-RENDERS" },
      verdict: proved(MEMBERS),
      coveredBy: ["SYM-COLORS"],
    },
  ],
  rejected: [
    {
      name: "a member is missing",
      row: setObligation,
      verdict: proved(["red", "green"]),
      coveredBy: ["SYM-COLORS"],
    },
    {
      name: "the domain is not in the receipt's code scope",
      row: setObligation,
      verdict: proved(MEMBERS),
      coveredBy: [],
    },
    {
      name: "the certificate did not re-check",
      row: setObligation,
      verdict: {
        kind: "exhaustive",
        evidence_level: "tested",
        certificate_rejection: "a member failed",
      } as unknown as CertificateVerdict,
      coveredBy: ["SYM-COLORS"],
    },
    {
      name: "the claim is not modeled",
      row: { result: "unresolved", reason: "the claim is ambiguous" },
      verdict: proved(MEMBERS),
      coveredBy: ["SYM-COLORS"],
    },
    {
      name: "the fact is the wrong shape for the kind",
      row: {
        result: "incompatible",
        fact_id: "FACT-LIMIT",
        reason: "FACT-LIMIT is a numeric fact",
      },
      verdict: proved(MEMBERS),
      coveredBy: ["SYM-COLORS"],
    },
  ],
};

/** Every claim binding verdict is earned exactly by its inputs: the exhaustive certificate. */
async function claimBindingVerdictsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-kibi-claim-bound-proofs-exhaustive",
    domain: {
      symbolId: "SYM-claim-binding-verdicts",
      members: CLAIM_BINDING_VERDICTS,
    },
    async check(expected) {
      const cases = CASES[expected];
      if (cases.length === 0) throw new Error(`no inputs earn ${expected}`);
      for (const input of cases) {
        const bindings = await judgeClaimBindings(contextAnswering(input.row), {
          testId: "TEST-COLORS",
          contract,
          verdict: input.verdict,
          coveredBySymbols: input.coveredBy,
        });
        const actual = bindings?.[0]?.binding;
        if (bindings?.length !== 1 || actual !== expected)
          throw new Error(
            `${input.name}: expected ${expected}, got ${JSON.stringify(bindings)}`,
          );
        if (expected === "rejected" && !bindings[0]?.reason)
          throw new Error(`${input.name}: a rejection names no reason`);
        if (expected === "derived" && bindings[0]?.scope !== "code")
          throw new Error(`${input.name}: a set derivation is not code scope`);
      }
    },
  });
}

describe("claim binding verdicts, proved by exhaustion", () => {
  test("every claim binding verdict is earned exactly by the inputs that call for it", async () => {
    const certificate = await claimBindingVerdictsCertificate();
    writeCodeCertificate(certificate);
    expect(failedMembers(certificate)).toEqual([]);
  });
});

describe("receipt evidence level", () => {
  test("a receipt is proved only by a claim derived from the code", () => {
    const binding = (
      verdict: ClaimBindingVerdict,
      scope?: "code" | "intent",
    ) => ({ claim_key: CLAIM, binding: verdict, ...(scope ? { scope } : {}) });
    expect(receiptEvidenceLevel("proved", undefined)).toBe("proved");
    expect(receiptEvidenceLevel("proved", [binding("derived", "code")])).toBe(
      "proved",
    );
    expect(receiptEvidenceLevel("proved", [binding("derived")])).toBe("proved");
    // A derivation from the knowledge base's own facts proves nothing about
    // the code, nor does a rejected or attested claim.
    expect(receiptEvidenceLevel("proved", [binding("derived", "intent")])).toBe(
      "tested",
    );
    expect(
      receiptEvidenceLevel("proved", [
        binding("rejected"),
        binding("attested"),
      ]),
    ).toBe("tested");
    expect(receiptEvidenceLevel("tested", [binding("derived", "code")])).toBe(
      "tested",
    );
  });
});
