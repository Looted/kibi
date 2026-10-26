import { describe, expect, test } from "bun:test";
import {
  EVIDENCE_LEVELS,
  type EvidenceLevel,
} from "../../src/public/evidence-levels.js";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  failedMembers,
  writeCodeCertificate,
} from "../../src/public/proof-certificates.js";
import { renderHtmlReport } from "../../src/report/html-report.js";
import { proofLabel } from "../../src/signoff/model.js";
import { prologCases } from "./prolog-cases.js";

// implements REQ-kibi-evidence-levels

/**
 * Every input the evidence level depends on, crossed: the proof status, a
 * re-checked certificate test or none, who wrote the requirement (and whether
 * a person approved it), and its stated firmness.
 */
const PROOF_STATUSES = ["tested", "missing", "unresolved", "not_applicable"];
const PROVED_TESTS = [[], [["TEST-PROOF", "exhaustive"]]] as const;
const ORIGINS: (Record<string, string> | null)[] = [
  null,
  { kind: "human" },
  { kind: "agent" },
  { kind: "agent", approved_by: "A person" },
  { kind: "migration" },
  { kind: "import" },
];
const FIRMNESS = [null, "firm", "default", "exploratory"];

type Case = Readonly<{
  status: string;
  proved: readonly (readonly [string, string])[];
  origin: Record<string, string> | null;
  firmness: string | null;
}>;

const CASES: Case[] = PROOF_STATUSES.flatMap((status) =>
  PROVED_TESTS.flatMap((proved) =>
    ORIGINS.flatMap((origin) =>
      FIRMNESS.map((firmness) => ({ status, proved, origin, firmness })),
    ),
  ),
);

/** The level the requirement states, derived from the case alone. */
function expectedLevel(input: Case): EvidenceLevel {
  if (input.status === "tested")
    return input.proved.length > 0 ? "proved" : "tested";
  const approved = input.origin?.approved_by !== undefined;
  const firm =
    input.firmness === "firm" ||
    (input.firmness === null && input.origin?.kind !== "agent");
  return approved || firm ? "asserted" : "unverified";
}

const GOAL = `
  Props0 = [priority=must],
  ( get_dict(origin, Case, Origin), Origin \\== null
  -> atom_json_dict(OriginJson, Origin, []), Props1 = [origin=OriginJson|Props0]
  ;  Props1 = Props0 ),
  ( get_dict(firmness, Case, Firmness), Firmness \\== null
  -> atom_string(FirmnessAtom, Firmness), Props = [firmness=FirmnessAtom|Props1]
  ;  Props = Props1 ),
  atom_string(Status, Case.status),
  findall(T-K, (member([TS, KS], Case.proved), atom_string(T, TS), atom_string(K, KS)), Proved),
  requirement_proof:requirement_evidence(Props, Status, ['TEST-E2E'], Proved, Level, _),
  Out = _{level: Level}
`;

/** Every evidence level is reported exactly when its evidence holds, and shown in report and signoff: the exhaustive certificate. */
async function evidenceLevelsCertificate(): Promise<CodeCertificate> {
  const answers = prologCases<{ level?: string; error?: string }>(
    "requirement_proof.pl",
    GOAL,
    CASES,
  );
  return exhaustiveCertificate({
    testId: "TEST-kibi-evidence-levels-exhaustive",
    domain: {
      symbolId: "SYM-cli-evidence-levels",
      members: EVIDENCE_LEVELS,
    },
    check(level) {
      const cases = CASES.map((input, index) => ({
        input,
        answer: answers[index],
      })).filter(({ input }) => expectedLevel(input) === level);
      if (cases.length === 0) throw new Error("no input reaches this level");
      for (const { input, answer } of cases)
        if (answer?.level !== level)
          throw new Error(
            `${JSON.stringify(input)} reported ${answer?.level ?? answer?.error}`,
          );
      const html = renderHtmlReport({
        requirements: {
          summary: { total: 1, proofNotApplicable: 0, proofTested: 0 },
          rows: [
            {
              id: "REQ-LEVEL",
              title: "Level",
              type: "req",
              proofStatus:
                level === "proved" || level === "tested" ? "tested" : "missing",
              evidenceLevel: level,
            },
          ],
        },
        symbols: {
          summary: { total: 0, uncovered: 0, mixedRole: 0 },
          rows: [],
        },
        branch: "main",
        generatedAt: new Date("2026-10-24T00:00:00.000Z"),
      });
      if (
        !html.includes(
          `evidence-level--${level}" title="Evidence level">${level}</span>`,
        )
      )
        throw new Error("kibi report does not show the level");
      const label = proofLabel({
        status: level === "proved" || level === "tested" ? "tested" : "missing",
        gate: level === "proved" || level === "tested" ? "tested" : "scenarios",
        testCount: 1,
        evidenceLevel: level,
        contradictions: [],
      });
      // tested is the label's own gate word; every other level is named.
      if (!label.includes(level))
        throw new Error(`kibi signoff shows "${label}"`);
    },
  });
}

describe("evidence levels, proved by exhaustion", () => {
  test("every evidence level is reported exactly when its evidence holds, and shown in report and signoff", async () => {
    const certificate = await evidenceLevelsCertificate();
    writeCodeCertificate(certificate);
    expect(failedMembers(certificate)).toEqual([]);
  });
});
