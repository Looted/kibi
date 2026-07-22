import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  ApprovalSchema,
  EpisodeRequestSchema,
  EpisodeResultSchema,
  EvidenceIndexSchema,
  LedgerEntrySchema,
  MAX_CONTRACT_BYTES,
  ProposalSchema,
  ReportSchema,
  RunLockSchema,
  RunStateSchema,
  assertApprovalMatchesProposal,
  assertRunLockMatches,
  canonicalJson,
  contractHash,
  createRunLockSchema,
} from "../contracts";

const fixturePath = join(import.meta.dir, "fixtures/valid-run-lock.json");
const vectorPath = join(
  import.meta.dir,
  "fixtures/canonical-json-vectors.json",
);
const sourceLockPath = resolve(
  import.meta.dir,
  "../../../tools/skillopt/source-lock.json",
);
const HASH = "b".repeat(64);
const RUN_ID = "00000000-0000-4000-8000-000000000001";
const PROPOSAL_ID = "00000000-0000-4000-8000-000000000003";

const VectorSchema = z.array(
  z.object({
    name: z.string(),
    value: z.json(),
    canonical: z.string(),
    sha256: z.string(),
  }),
);

function runLockFixture(): Readonly<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(readFileSync(fixturePath, "utf8"));
  return RunLockSchema.parse(parsed);
}

function proposalFixture(status: "accepted" | "rejected") {
  return ProposalSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "proposal",
    proposalId: PROPOSAL_ID,
    runId: RUN_ID,
    runLockHash: HASH,
    skill: "kibi-usage",
    candidateBodyHash: HASH,
    baselineFrontmatterHash: HASH,
    candidateFrontmatterHash: HASH,
    baselineResourcesHash: HASH,
    candidateResourcesHash: HASH,
    reportHash: HASH,
    createdAt: "2026-07-21T12:00:00Z",
    status,
  });
}

describe("SkillOpt hardened contract boundaries", () => {
  test("uses shared RFC 8785 vectors for Unicode and small floats", () => {
    const vectors = VectorSchema.parse(
      JSON.parse(readFileSync(vectorPath, "utf8")),
    );

    for (const vector of vectors) {
      expect(canonicalJson(vector.value), vector.name).toBe(vector.canonical);
      expect(contractHash(vector.value), vector.name).toBe(vector.sha256);
    }
  });

  test("rejects identical dirty run locks", () => {
    const dirty = RunLockSchema.parse({
      ...runLockFixture(),
      dirtyState: { isDirty: true, diffHash: HASH },
    });

    expect(() => assertRunLockMatches(dirty, dirty)).toThrow("dirty run lock");
  });

  test("reloads the authoritative SkillOpt source lock for drift checks", () => {
    const directory = mkdtempSync(join(tmpdir(), "skillopt-source-lock-"));
    const changedPath = join(directory, "source-lock.json");
    const source = JSON.parse(readFileSync(sourceLockPath, "utf8"));
    writeFileSync(changedPath, JSON.stringify({ ...source, version: "0.2.1" }));

    try {
      expect(() =>
        createRunLockSchema(changedPath).parse(runLockFixture()),
      ).toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("rejects approval of a rejected proposal even with a recomputed hash", () => {
    const proposal = proposalFixture("rejected");
    const approval = ApprovalSchema.parse({
      schemaVersion: "1.0.0",
      artifactType: "approval",
      approvalId: "00000000-0000-4000-8000-000000000004",
      proposalId: proposal.proposalId,
      proposalHash: contractHash(z.json().parse(proposal)),
      runId: proposal.runId,
      runLockHash: proposal.runLockHash,
      reportHash: proposal.reportHash,
      candidateBodyHash: proposal.candidateBodyHash,
      reviewer: "reviewer@example.test",
      decision: "approved",
      decidedAt: "2026-07-21T12:00:00Z",
    });

    expect(() => assertApprovalMatchesProposal(proposal, approval)).toThrow(
      "proposal is not approval-eligible",
    );
  });

  test("enforces 1 MiB before every direct Zod artifact parse", () => {
    const huge = "x".repeat(MAX_CONTRACT_BYTES + 1);
    const cases: readonly [string, z.ZodType, unknown][] = [
      ["approval", ApprovalSchema, { reviewer: huge }],
      ["episode request", EpisodeRequestSchema, { prompt: huge }],
      ["episode result", EpisodeResultSchema, { criticalFailures: [huge] }],
      [
        "evidence",
        EvidenceIndexSchema,
        { events: [{ event: { payload: huge } }] },
      ],
      ["ledger", LedgerEntrySchema, { category: huge }],
      ["proposal", ProposalSchema, { createdAt: huge }],
      ["report", ReportSchema, { cells: [huge] }],
      ["run lock", RunLockSchema, { artifactRoot: huge }],
      ["run state", RunStateSchema, { updatedAt: huge }],
    ];

    for (const [name, schema, artifact] of cases) {
      expect(() => schema.parse(artifact), name).toThrow(
        `contract exceeds ${MAX_CONTRACT_BYTES} bytes`,
      );
    }
  });
});
