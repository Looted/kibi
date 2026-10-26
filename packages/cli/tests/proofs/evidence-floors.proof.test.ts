import { describe, expect, test } from "bun:test";
import {
  EVIDENCE_LEVELS,
  type EvidenceLevel,
  evidenceRank,
} from "../../src/public/evidence-levels.js";
import { evidenceFloorViolations } from "../../src/public/operations/evidence-floor.js";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  failedMembers,
  writeCodeCertificate,
} from "../../src/public/proof-certificates.js";
import { prologCases } from "./prolog-cases.js";

// implements REQ-kibi-evidence-floors

/** Gaps that decide pending re-proof: none, only stale receipts, a real gap. */
const GAP_SETS = [[], ["stale_proof_receipt"], ["missing_proof_receipt"]];
const FIRMNESS = [null, "firm", "default", "exploratory"];

type Case = Readonly<{
  required: EvidenceLevel | null;
  firmness: string | null;
  level: EvidenceLevel;
  gaps: readonly string[];
}>;

/** Every floor (stated, or derived from each firmness) against every level and gap set. */
const CASES: Case[] = [
  ...EVIDENCE_LEVELS.map((required) => ({ required, firmness: null })),
  ...FIRMNESS.map((firmness) => ({ required: null, firmness })),
].flatMap((floor) =>
  EVIDENCE_LEVELS.flatMap((level) =>
    GAP_SETS.map((gaps) => ({ ...floor, level, gaps })),
  ),
);

type Floor = Readonly<{
  required?: string;
  source?: string;
  status?: string;
  error?: string;
}>;

function expectedFloor(input: Case): Floor {
  // A requirement without a stated floor and without firmness was written by
  // a person (no origin here), so it reads as firm.
  const firm = input.firmness === "firm" || input.firmness === null;
  const required: EvidenceLevel =
    input.required ?? (firm ? "tested" : "unverified");
  const status =
    evidenceRank(input.level) >= evidenceRank(required)
      ? "met"
      : required === "tested" &&
          input.gaps.length > 0 &&
          input.gaps.every((gap) => gap === "stale_proof_receipt")
        ? "pending_reproof"
        : "below";
  return {
    required,
    source: input.required === null ? "firmness" : "explicit",
    status,
  };
}

const GOAL = `
  ( get_dict(required, Case, Required), Required \\== null
  -> atom_string(RequiredAtom, Required), Props0 = [required_evidence=RequiredAtom]
  ;  Props0 = [] ),
  ( get_dict(firmness, Case, Firmness), Firmness \\== null
  -> atom_string(FirmnessAtom, Firmness), Props = [firmness=FirmnessAtom|Props0]
  ;  Props = Props0 ),
  atom_string(Level, Case.level),
  findall(G, (member(GS, Case.gaps), atom_string(G, GS)), Gaps),
  requirement_proof:evidence_floor(Props, Level, Gaps, _{}, Out)
`;

/** Every floor holds every evidence level to its rank, and check fails exactly the requirements below it: the exhaustive certificate. */
async function evidenceFloorsCertificate(): Promise<CodeCertificate> {
  const answers = prologCases<Floor>("requirement_proof.pl", GOAL, CASES);
  return exhaustiveCertificate({
    testId: "TEST-kibi-evidence-floors-exhaustive",
    domain: {
      symbolId: "SYM-cli-evidence-levels",
      members: EVIDENCE_LEVELS,
    },
    check(floor) {
      const cases = CASES.map((input, index) => ({
        input,
        answer: answers[index],
        expected: expectedFloor(input),
      })).filter(({ expected }) => expected.required === floor);
      if (cases.length === 0) throw new Error("no requirement has this floor");
      for (const { input, answer, expected } of cases) {
        if (
          answer?.required !== expected.required ||
          answer?.source !== expected.source ||
          answer?.status !== expected.status
        )
          throw new Error(
            `${JSON.stringify(input)} gave ${JSON.stringify(answer)}, expected ${JSON.stringify(expected)}`,
          );
        if (expected.status === "met") continue;
        const row = {
          id: "REQ-FLOOR",
          evidenceLevel: input.level,
          requiredEvidence: floor,
          requiredEvidenceSource: expected.source ?? "explicit",
          status: expected.status as "below" | "pending_reproof",
          proofStatus: "unresolved",
          proofGaps: input.gaps,
        };
        const plain = evidenceFloorViolations([row]).length;
        const fresh = evidenceFloorViolations([row], {
          freshEvidence: true,
        }).length;
        if (plain !== (expected.status === "below" ? 1 : 0))
          throw new Error(`kibi check reported ${plain} for ${row.status}`);
        if (fresh !== 1)
          throw new Error(
            `kibi check --fresh-evidence reported ${fresh} for ${row.status}`,
          );
      }
    },
  });
}

describe("evidence floors, proved by exhaustion", () => {
  test("every floor holds every evidence level to its rank, and check fails exactly the requirements below it", async () => {
    const certificate = await evidenceFloorsCertificate();
    writeCodeCertificate(certificate);
    expect(failedMembers(certificate)).toEqual([]);
  });
});
