import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadBundledSkillFrom,
  readBundledSkillResourceFrom,
} from "../../../../packages/cli/src/public/skills";
import { composeCampaignManifest, sha256Text } from "../../campaign-artifacts";
import type { CampaignDependencies } from "../../campaign-workflow";
import { CANONICAL_SKILLS } from "../../catalog";
import { surface } from "../../real-workflow";
import {
  type PublicTaskDescriptor,
  canonicalHash,
} from "../../real-workflow-types";
import { replayCodexEpisode } from "../../runtime/codex-episode";
import { normalizeCodexJsonl } from "../../runtime/codex-events";
import type { CellReceipt } from "../../scoring/cell";

/**
 * Offline campaign fixtures: a fake source surface, trusted fake cells and
 * campaign dependencies that never start a model, shared by the campaign
 * workflow tests and the host-neutral optimization e2e exerciser.
 */

export const sourceSurface = {
  body: "Portable baseline prose.\n\n## Discovery\nUse exact lookup.\n\n## Closeout\nRead the final state.\n",
  frontmatterHash: "a".repeat(64),
  resourcesHash: "b".repeat(64),
} as const;

export const tasks: PublicTaskDescriptor[] = [
  "discovery-exact-lookup",
  "safe-mutation-direction",
  "fact-predicate-modeling",
  "validation-recovery",
  "intent-consult",
].map((family) => ({
  id: `kibi-usage-${family}-development-1`,
  family,
  split: "development" as const,
  publicClaim: {
    taskId: `kibi-usage-${family}-development-1`,
    text: `Public task ${family}`,
    publicManifestHash: "a".repeat(64),
    workspaceHash: "b".repeat(64),
  },
}));

export function candidateManifest() {
  return composeCampaignManifest({
    skill: "kibi-usage",
    surface: sourceSurface,
    insertions: [
      {
        headingAnchor: "## Discovery",
        paragraph:
          "Search the supplied target, apply only the authorized operation, and read it back.",
      },
    ],
    provenance: { kind: "host-composed", modelSource: "none" },
  });
}

export function gates() {
  return {
    verdict: "pass" as const,
    targetModel: "gpt-5.6-luna" as const,
    optimizerModel: "gpt-5.6-sol" as const,
    skilloptCommit: "a".repeat(40) as `${string}`,
    codexVersion: "test",
    authMode: "file" as const,
    bwrap: true,
    sourceClean: true,
    configValid: true,
    paidModelCalls: 0 as const,
  };
}

export function canary() {
  return {
    verdict: "pass" as const,
    runId: "canary",
    targetModel: "gpt-5.6-luna" as const,
    optimizerModel: "gpt-5.6-sol" as const,
    authMode: "file" as const,
    paidModelCalls: 2 as const,
    modelInvocationAttempts: 2 as const,
    modelRuns: [],
    events: [],
  };
}

export function trustedSample(
  input: Readonly<{
    variant: { bodyHash: string; variant: string };
    task: { id: string };
    replicate: 1 | 2 | 3;
    runLockHash: string;
    score: number;
    hardPass?: boolean;
    criticalFailures?: readonly string[];
  }>,
): Awaited<ReturnType<CampaignDependencies["evaluateSample"]>> {
  const id = `${input.task.id}-${input.replicate}-${input.variant.bodyHash}`;
  return {
    score: input.score,
    hardPass: input.hardPass ?? false,
    criticalFailures: [...(input.criticalFailures ?? [])],
    securityFailures: [],
    receiptPath: `/trusted/${id}/episode-receipt.json`,
    usage: { inputTokens: 11, cachedInputTokens: 2, outputTokens: 3 },
    receiptStatus: "completed",
    receiptSha256: "a".repeat(64),
    artifactDirectory: `/trusted/${id}`,
    artifactRefs: [
      {
        name: "evidenceIndex",
        path: "evidence-index.json",
        sha256: "b".repeat(64),
      },
    ],
    requestPath: `/trusted/${id}/campaign-request.json`,
    requestSha256: "c".repeat(64),
    requestHash: "d".repeat(64),
    bodyLabel: `variant-${"e".repeat(16)}`,
    runLockHash: input.runLockHash,
    violations: [],
    isolationSentinels: [],
  };
}

export async function writeTrustedCell(
  input: Parameters<CampaignDependencies["runCell"]>[0],
): Promise<Awaited<ReturnType<CampaignDependencies["runCell"]>>> {
  const transcript = [
    JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
    JSON.stringify({
      type: "turn.completed",
      usage: { input_tokens: 10, cached_input_tokens: 2, output_tokens: 3 },
    }),
  ].join("\n");
  const stderr = "sanitized stderr\n";
  const evidence = {
    brokerTrace: '{"kind":"tools/call"}\n',
    diagnosticReceipt: '{"tool":"kb_status"}\n',
    finalState: '{"status":"fresh"}\n',
  } as const;
  const score: CellReceipt = {
    outcome: "fail",
    terminalCategory: "behavioral_failure",
    score: input.request.variant === "baseline" ? 40 : 45,
    soft: 1,
    hard: 0,
    retryable: false,
    adoptionEligible: false,
    components: { finalState: 20, protocol: 10, isolation: 10 },
    criticalFailures:
      input.request.variant === "baseline" ? ["isolation-sentinel"] : [],
    conflictKeys: [],
    ...(input.request.variant === "baseline"
      ? {}
      : {
          protocolFailure: {
            kind: "missing_required_call" as const,
            tool: "kb_query",
            position: 2,
          },
        }),
  };
  const receipt = replayCodexEpisode({
    request: input.request,
    transcript,
    stderr,
    exitCode: 0,
    termination: "exit",
    startedAt: "2026-09-14T10:00:00Z",
    finishedAt: "2026-09-14T10:00:01Z",
    evidence,
    score,
    hiddenMarkers: [],
    forbiddenRoots: [],
    pricingHash: "f".repeat(64),
    priceAmount: 0,
  });
  const artifactDirectory = join(
    input.artifactRoot,
    "episodes",
    input.request.episodeId,
  );
  await mkdir(artifactDirectory, { recursive: true });
  const normalized = normalizeCodexJsonl(transcript, {
    hiddenMarkers: [],
    forbiddenRoots: [],
  });
  const contents = new Map<string, string>([
    ["raw-host.jsonl", transcript],
    ["raw-stderr.log", stderr],
    [
      "normalized-events.jsonl",
      normalized.events.map((event) => JSON.stringify(event)).join("\n"),
    ],
    ["broker-trace.jsonl", evidence.brokerTrace],
    ["diagnostic-receipt.jsonl", evidence.diagnosticReceipt],
    ["final-state.json", evidence.finalState],
    ["evidence-index.json", `${JSON.stringify(receipt.evidenceIndex)}\n`],
  ]);
  for (const [name, content] of contents)
    await writeFile(join(artifactDirectory, name), content);
  const receiptPath = join(artifactDirectory, "episode-receipt.json");
  await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`);
  return { receipt, artifactDirectory, receiptPath };
}

export function defaultCellDependencies(
  input: Partial<CampaignDependencies>,
  overrides: Partial<CampaignDependencies> = {},
): Partial<CampaignDependencies> {
  const {
    evaluateSample: _evaluateSample,
    verifyCell: _verifyCell,
    ...trustedDefaults
  } = input;
  return {
    ...trustedDefaults,
    ...overrides,
    resolveFixture: async ({ publicClaim }) =>
      ({
        publicClaim,
        workspaceRoot: "/tmp/trusted-workspace",
        workspaceHash: "b".repeat(64),
        evaluatorManifest: {},
        fixtureClaim: {},
      }) as Awaited<ReturnType<CampaignDependencies["resolveFixture"]>>,
    runCell: writeTrustedCell,
  };
}

export async function writeAssembledSkills(
  input: Parameters<CampaignDependencies["assemble"]>[0],
) {
  const sourceSkillsDir = join(
    input.sourceRepoRoot,
    "packages/cli/src/public/skills",
  );
  const targetSkillsDir = join(input.workspace, ".agents/skills");
  const candidates = input.candidates ?? {};
  const skills = [];
  for (const id of CANONICAL_SKILLS) {
    const source = loadBundledSkillFrom(sourceSkillsDir, id);
    const sourceMarkdown = await readFile(
      join(source.rootDir, "SKILL.md"),
      "utf8",
    );
    const prefix = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(sourceMarkdown)?.[0];
    if (prefix === undefined) throw new Error("assembled_frontmatter_missing");
    const body = candidates[id]?.body ?? source.body;
    const root = join(targetSkillsDir, id);
    await mkdir(root, { recursive: true });
    await writeFile(join(root, "SKILL.md"), `${prefix}${body}`);
    const resources = Object.fromEntries(
      [...(source.manifest.resources ?? [])]
        .sort()
        .map((resource) => [
          resource,
          readBundledSkillResourceFrom(sourceSkillsDir, id, resource),
        ]),
    );
    for (const [resource, content] of Object.entries(resources)) {
      const target = join(root, resource);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, content);
    }
    const assembled = loadBundledSkillFrom(targetSkillsDir, id);
    const assembledResources = Object.fromEntries(
      [...(assembled.manifest.resources ?? [])]
        .sort()
        .map((resource) => [
          resource,
          readBundledSkillResourceFrom(targetSkillsDir, id, resource),
        ]),
    );
    skills.push({
      id,
      bodyHash: sha256Text(assembled.body),
      frontmatterHash: canonicalHash(assembled.manifest),
      resourcesHash: canonicalHash(assembledResources),
      bodyChanged: assembled.body !== source.body,
    });
  }
  return { skills };
}

export async function actualCandidateManifest() {
  const current = await surface(process.cwd(), "kibi-usage");
  return composeCampaignManifest({
    skill: "kibi-usage",
    surface: current,
    insertions: [
      {
        headingAnchor: "## Interface Selection",
        paragraph:
          "Use the narrowest approved interface, then read back the exact resulting state.",
      },
    ],
    provenance: { kind: "host-composed", modelSource: "none" },
  });
}

export function dependencies(
  options: Readonly<{ badAfterFirst?: boolean }> = {},
) {
  const calls: string[] = [];
  let samples = 0;
  const deps: Partial<CampaignDependencies> = {
    sourceClean: async () => {
      calls.push("source-clean");
      return true;
    },
    sourceFence: async () => ({
      head: "a".repeat(40),
      treeHash: "b".repeat(64),
      files: 1,
    }),
    surface: async () => sourceSurface,
    fixtureReadiness: async () => {
      calls.push("fixture-readiness");
    },
    materializeFixtures: async ({ runRoot }) => {
      calls.push("materialize");
      return runRoot;
    },
    initializeBudget: async () => {
      calls.push("budget");
      return {} as never;
    },
    runPreflight: async () => {
      calls.push("preflight");
      return gates() as never;
    },
    runCanary: async () => {
      calls.push("canary");
      return canary() as never;
    },
    createRuntimeLease: async () => ({
      root: "/tmp/runtime",
      codexExecutable: "/tmp/codex",
      bwrapExecutable: "/tmp/bwrap",
      codeModeHostExecutable: "/tmp/codex-code-mode-host",
      cleanup: async () => {
        calls.push("runtime-cleanup");
      },
    }),
    developmentTasks: async () => tasks,
    evaluateSample: async ({ variant, task, replicate, runLockHash }) => {
      samples += 1;
      if (options.badAfterFirst && samples === 2)
        throw new Error("evaluator_unavailable");
      const score = variant.variant === "baseline" ? 40 : 45;
      return trustedSample({
        variant,
        task,
        replicate,
        runLockHash,
        score,
      });
    },
    verifyCell: async () => {},
  };
  return { deps, calls };
}

export async function tempArtifact(
  name: string,
): Promise<{ parent: string; root: string }> {
  const parent = await mkdtemp(join(tmpdir(), `campaign-${name}-`));
  return { parent, root: join(parent, "artifacts") };
}
