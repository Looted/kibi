import type { FixtureSetupMode } from "../fixtures/case-contracts";
import {
  commitAndSync,
  FixtureSetupError,
  initSeededRepository,
  runCliWithRetry,
  runSeededFixtureTest,
  runStagedCli,
  validateSeed,
  writeDocuments,
} from "./fixture-kb-setup";
import {
  BROAD_DOCUMENTS,
  FIXTURE_TEST_PATH,
  isSeededContextViolation,
  OWNER_DOCUMENTS,
  QUALITY_IDS,
  reasonDocuments,
  SPLIT_INSTRUCTION,
  THRESHOLD_DOCUMENTS,
} from "./quality-seeds";

/** Setup modes owned by the ownership-precision and requirement-quality cases. */
export const QUALITY_SETUP_MODES = [
  "seeded_owner_choice_kb",
  "seeded_requirement_at_threshold_kb",
  "seeded_reasonless_requirement_kb",
  "seeded_sourced_reason_kb",
  "seeded_broad_requirement_kb",
] as const satisfies readonly FixtureSetupMode[];

export type QualitySetupMode = (typeof QUALITY_SETUP_MODES)[number];

export function isQualitySetupMode(
  mode: string | undefined,
): mode is QualitySetupMode {
  return (QUALITY_SETUP_MODES as readonly string[]).includes(mode ?? "");
}

function documentsFor(
  mode: QualitySetupMode,
): Readonly<Record<string, string>> {
  switch (mode) {
    case "seeded_owner_choice_kb":
      return OWNER_DOCUMENTS;
    case "seeded_requirement_at_threshold_kb":
      return THRESHOLD_DOCUMENTS;
    case "seeded_reasonless_requirement_kb":
      return reasonDocuments(false);
    case "seeded_sourced_reason_kb":
      return reasonDocuments(true);
    case "seeded_broad_requirement_kb":
      return {
        ...BROAD_DOCUMENTS,
        "approval-state.json": `${JSON.stringify(
          {
            phase: "post-approval",
            mutationAllowed: true,
            approvalActor: "person",
            approvedInstruction: SPLIT_INSTRUCTION,
            approvedAt: "2026-11-12",
          },
          null,
          2,
        )}\n`,
      };
  }
}

async function coordinates(workspaceTarget: string, cliRoot: string) {
  await runCliWithRetry(
    () =>
      runStagedCli(cliRoot, workspaceTarget, [
        "sync",
        "--refresh-symbol-coordinates",
      ]),
    "coordinate refresh",
  );
}

async function checkJson(
  workspaceTarget: string,
  cliRoot: string,
): Promise<Record<string, unknown>> {
  const result = await runStagedCli(cliRoot, workspaceTarget, [
    "check",
    "--format",
    "json",
  ]);
  try {
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    const content = parsed.structuredContent;
    return content !== null && typeof content === "object"
      ? (content as Record<string, unknown>)
      : parsed;
  } catch {
    throw new FixtureSetupError(
      `quality fixture check did not print JSON: ${result.stdout.slice(0, 400)} ${result.stderr.slice(0, 400)}`,
    );
  }
}

function hasBroadReview(content: Record<string, unknown>, id: string) {
  const diagnostics = Array.isArray(content.qualityDiagnostics)
    ? content.qualityDiagnostics
    : [];
  return diagnostics.some((entry) => {
    const text = JSON.stringify(entry);
    return text.includes("broad_requirement_review") && text.includes(id);
  });
}

/**
 * Evaluator-owned staging for the KB-quality cases. Each mode commits a
 * prose-only KB over src/fixture.ts with a passing unit test. The reasonless
 * seeds carry exactly one entity-context-missing violation by design, and the
 * broad seed exactly one broad_requirement_review diagnostic.
 */
export async function setupQualityFixture(
  workspaceTarget: string,
  cliRoot: string,
  mode: QualitySetupMode,
): Promise<void> {
  await initSeededRepository(workspaceTarget, cliRoot);
  await writeDocuments(workspaceTarget, documentsFor(mode));
  await runSeededFixtureTest(workspaceTarget, FIXTURE_TEST_PATH);
  await commitAndSync(workspaceTarget, cliRoot);
  if (mode !== "seeded_owner_choice_kb") {
    // The seeded symbols need coordinates; the owner-choice seed has none.
    await coordinates(workspaceTarget, cliRoot);
    await commitAndSync(workspaceTarget, cliRoot);
  }
  switch (mode) {
    case "seeded_reasonless_requirement_kb":
    case "seeded_sourced_reason_kb": {
      const content = await checkJson(workspaceTarget, cliRoot);
      const violations = Array.isArray(content.violations)
        ? content.violations
        : [];
      if (violations.length !== 1 || !isSeededContextViolation(violations[0]))
        throw new FixtureSetupError(
          `${mode} must report only entity-context-missing for ${QUALITY_IDS.label}: ${JSON.stringify(violations).slice(0, 600)}`,
        );
      return;
    }
    case "seeded_broad_requirement_kb": {
      await validateSeed(workspaceTarget, cliRoot, `${mode} fixture`);
      const content = await checkJson(workspaceTarget, cliRoot);
      if (!hasBroadReview(content, QUALITY_IDS.handling))
        throw new FixtureSetupError(
          `${mode} must report broad_requirement_review for ${QUALITY_IDS.handling}: ${JSON.stringify(content.qualityDiagnostics).slice(0, 600)}`,
        );
      return;
    }
    case "seeded_requirement_at_threshold_kb": {
      await validateSeed(workspaceTarget, cliRoot, `${mode} fixture`);
      const content = await checkJson(workspaceTarget, cliRoot);
      if (hasBroadReview(content, QUALITY_IDS.normalization))
        throw new FixtureSetupError(
          `${mode} must start at the threshold, not over it`,
        );
      return;
    }
    default:
      await validateSeed(workspaceTarget, cliRoot, `${mode} fixture`);
  }
}
