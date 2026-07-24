import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import canonicalize from "canonicalize";
import {
  loadBundledSkill,
  readBundledSkillResource,
} from "../../packages/cli/src/public/skills";
import { adoptApprovedSkill, planSkillAdoption } from "./adoption";
import { validateApproval } from "./approval";
import { JsonValueSchema, contractHash } from "./contracts/common";
import type { Approval } from "./contracts/review";
import {
  type RunLock,
  parseRunLockText,
  runLockHash,
} from "./contracts/run-lock";
import { buildProposal } from "./proposal";
import { type ReportArtifacts, buildReportArtifacts } from "./report";
import {
  type FrozenVariant,
  createBaselineVariant,
  freezeCandidateVariant,
} from "./variants";

const SKILL = "kibi-usage" as const;
const FIXTURE_PATH = join(
  import.meta.dir,
  "tests/fixtures/valid-run-lock.json",
);

export type OfflineReviewArtifacts = Readonly<{
  runLock: RunLock;
  baseline: FrozenVariant;
  candidate: FrozenVariant;
  report: ReportArtifacts;
  proposal: ReturnType<typeof buildProposal>;
  approval: Approval;
}>;

function hash(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalHash(value: unknown): string {
  const serialized = canonicalize(value);
  if (serialized === undefined)
    throw new Error("offline_surface_not_canonical");
  return hash(serialized);
}

async function loadSurface(): Promise<{
  body: string;
  frontmatterHash: string;
  resourcesHash: string;
}> {
  const bundle = loadBundledSkill(SKILL);
  const markdown = await readFile(join(bundle.rootDir, "SKILL.md"), "utf8");
  if (!/^---\r?\n[\s\S]*?\r?\n---\r?\n/.test(markdown)) {
    throw new Error("offline_skill_frontmatter_missing");
  }
  const resources = Object.fromEntries(
    await Promise.all(
      [...(bundle.manifest.resources ?? [])]
        .sort()
        .map(async (resource) => [
          resource,
          readBundledSkillResource(SKILL, resource),
        ]),
    ),
  );
  return {
    body: bundle.body,
    frontmatterHash: canonicalHash(bundle.manifest),
    resourcesHash: canonicalHash(resources),
  };
}

// implements REQ-skillopt-codex-optimization
export async function buildOfflineReviewArtifacts(
  runId: string,
  artifactRoot: string,
): Promise<OfflineReviewArtifacts> {
  const fixture = JSON.parse(await readFile(FIXTURE_PATH, "utf8")) as Record<
    string,
    unknown
  >;
  const runLock = parseRunLockText(
    JSON.stringify({ ...fixture, runId, artifactRoot }),
  );
  const loadedSurface = await loadSurface();
  const surface = {
    frontmatterHash: loadedSurface.frontmatterHash,
    resourcesHash: loadedSurface.resourcesHash,
  };
  const baseline = createBaselineVariant({
    skill: SKILL,
    body: loadedSurface.body,
    ...surface,
  });
  const candidate = freezeCandidateVariant({
    skill: SKILL,
    variant: "skillopt",
    body: "Use Kibi through MCP and preserve the declared workflow.\n",
    provenance: "skillopt",
    ...surface,
  });
  const report = buildReportArtifacts({
    runId,
    runLockHash: runLockHash(runLock),
    skill: SKILL,
    cells: [{ score: 100, hard: 1 }],
    privateValues: [],
    priceEquivalentEstimate: {
      currency: "USD",
      amount: 0,
      pricingHash: runLock.pricingHash,
      kind: "price-equivalent-estimate-not-invoice",
    },
    gateOutcome: "pass",
    gateResults: {
      aggregate: true,
      bootstrap: true,
      family: true,
      security: true,
      bundle: true,
    },
    generatedAt: "2026-07-23T00:00:00.000Z",
  });
  const proposal = buildProposal({
    proposalId: runId,
    createdAt: "2026-07-23T00:00:01.000Z",
    report: report.report,
    baseline,
    candidate,
  });
  const approval = validateApproval({
    approval: {
      schemaVersion: "1.0.0",
      artifactType: "approval",
      approvalId: runId,
      proposalId: proposal.proposalId,
      proposalHash: contractHash(JsonValueSchema.parse(proposal)),
      runId,
      runLockHash: runLockHash(runLock),
      reportHash: report.reportHash,
      candidateBodyHash: candidate.bodyHash,
      reviewer: "offline-reviewer",
      decision: "approved",
      decidedAt: "2026-07-23T00:00:02.000Z",
    },
    proposal,
    candidate,
    runLock,
    report: report.report,
  });
  return { runLock, baseline, candidate, report, proposal, approval };
}

// implements REQ-skillopt-codex-optimization
export async function writeOfflineReviewArtifacts(
  root: string,
  artifacts: OfflineReviewArtifacts,
): Promise<void> {
  await mkdir(root, { recursive: true, mode: 0o700 });
  await Promise.all([
    writeFile(
      join(root, "run-lock.json"),
      `${JSON.stringify(artifacts.runLock, null, 2)}\n`,
    ),
    writeFile(
      join(root, "baseline-variant.json"),
      `${JSON.stringify(artifacts.baseline, null, 2)}\n`,
    ),
    writeFile(
      join(root, "candidate-variant.json"),
      `${JSON.stringify(artifacts.candidate, null, 2)}\n`,
    ),
    writeFile(join(root, "report.json"), artifacts.report.json),
    writeFile(join(root, "report.md"), artifacts.report.markdown),
    writeFile(
      join(root, "proposal.json"),
      `${JSON.stringify(artifacts.proposal, null, 2)}\n`,
    ),
    writeFile(
      join(root, "approval.json"),
      `${JSON.stringify(artifacts.approval, null, 2)}\n`,
    ),
  ]);
}

// implements REQ-skillopt-codex-optimization
export async function planOfflineAdoption(
  repoRoot: string,
  artifacts: OfflineReviewArtifacts,
) {
  return planSkillAdoption({
    repoRoot,
    approval: artifacts.approval,
    proposal: artifacts.proposal,
    candidate: artifacts.candidate,
    runLock: artifacts.runLock,
    report: artifacts.report.report,
  });
}

export async function adoptOfflineApprovedSkill(
  repoRoot: string,
  artifacts: OfflineReviewArtifacts,
) {
  return adoptApprovedSkill(
    {
      repoRoot,
      approval: artifacts.approval,
      proposal: artifacts.proposal,
      candidate: artifacts.candidate,
      runLock: artifacts.runLock,
      report: artifacts.report.report,
    },
    { runMirrorSync: async () => undefined },
  );
}
