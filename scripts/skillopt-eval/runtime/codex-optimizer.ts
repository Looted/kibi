import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import type { SkillOptStepRequest, SkillOptStepResult } from "../optimize";
import { validateCandidateBody } from "../variants";
import { resolveIsolationArtifactRoot } from "./artifact-root";
import {
  RequiredMcpStartupError,
  stageCapabilityCanary,
} from "./canary-runtime";
import { prepareExistingLogin } from "./codex-auth";
import { createIsolationWorkspace } from "./isolation-workspace";
import { buildCodexConfig, buildCodexExecArgv } from "./permissions";
import { runBoundedProcess } from "./process";

const BodySchema = z.object({ body: z.string().min(1) }).strict();
const MIN_COMPLETE_BODY_BYTES = 1_000;
const REQUIRED_BODY_GUIDANCE = [
  "npx --no-install kibi",
  "bunx --no-install kibi",
  "Do not read or edit files inside `.kb` directly",
  "kb_search",
  "kb_query",
  "kb_upsert",
  "kb_check",
  "kb_semantic_advisor",
  "kb_suggest_predicates",
  "kb_model_requirement",
  "fact_kind: predicate",
  "predicate_name",
  "predicate_args",
  "canonical_key",
  "polarity",
  "predicate_schema",
  "requires_predicate",
  "logic_claims",
  "claim_key",
  "claim_text",
  "logic-coverage",
] as const;
const REPOSITORY_POLICY_LEAKS = [
  /bun run version-packages/i,
  /(?:branch|merge|merged|merging)[^\n]{0,80}`(?:develop|master)`/i,
  /`(?:develop|master)`[^\n]{0,80}(?:branch|merge|merged|merging)/i,
  /public training trajectories/i,
  /kibi-usage-[a-z0-9-]+-(?:train|development|held-out)-\d+/i,
  /publishable package set/i,
] as const;

// implements REQ-skillopt-codex-optimization
export class CodexOptimizerError extends Error {
  // implements REQ-skillopt-codex-optimization
  readonly name = "CodexOptimizerError";
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

// implements REQ-skillopt-codex-optimization
export function parseCodexOptimizerBody(lastMessage: string): string {
  const parsed = BodySchema.safeParse(parseJson(lastMessage));
  if (!parsed.success) {
    throw new CodexOptimizerError("optimizer_output_missing_body");
  }
  const body = parsed.data.body;
  validateCandidateBody(body);
  if (
    Buffer.byteLength(body, "utf8") < MIN_COMPLETE_BODY_BYTES ||
    REQUIRED_BODY_GUIDANCE.some((guidance) => !body.includes(guidance))
  ) {
    throw new CodexOptimizerError("optimizer_output_incomplete_body");
  }
  if (REPOSITORY_POLICY_LEAKS.some((pattern) => pattern.test(body))) {
    throw new CodexOptimizerError("optimizer_output_repository_policy_leak");
  }
  return body;
}

// implements REQ-skillopt-codex-optimization
export async function persistCodexOptimizerBody(
  artifactRoot: string,
  sourceWorktree: string,
  input: Readonly<{
    runId: string;
    skill: string;
    step: number;
    body: string;
  }>,
): Promise<void> {
  const acceptedRoot = resolveIsolationArtifactRoot(
    resolve(artifactRoot, "accepted-output"),
    sourceWorktree,
  );
  await mkdir(acceptedRoot, { recursive: true, mode: 0o700 });
  await writeFile(join(acceptedRoot, "candidate-body.md"), input.body, {
    encoding: "utf8",
    mode: 0o600,
  });
  await writeFile(
    join(acceptedRoot, "receipt.json"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-accepted-optimizer-output",
      runId: input.runId,
      skill: input.skill,
      step: input.step,
      bodyHash: createHash("sha256").update(input.body, "utf8").digest("hex"),
      bodyBytes: Buffer.byteLength(input.body, "utf8"),
    })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

function promptFor(request: SkillOptStepRequest): string {
  return [
    "Return one JSON object with exactly one string field named body.",
    "Rewrite only the skill body. Do not include Markdown frontmatter.",
    "Preserve MCP-first Kibi guidance, approval boundaries, and source-file traceability.",
    "Write a portable library skill. Do not prescribe a package manager, repository script, branch name, changeset policy, merge flow, CI provider, or publishing workflow; those belong to each consuming repository's own instructions.",
    "Preserve the canonical project-local CLI fallback and direct-.kb prohibition, including the exact phrases `npx --no-install kibi`, `bunx --no-install kibi`, and `Do not read or edit files inside `.kb` directly`.",
    "The body must pass candidate safety validation: do not mention OpenCode, Cursor, API keys, or provider SDKs; do not add positive instructions to read, write, edit, modify, access, inspect, or open .kb files.",
    "Do not copy the current body unchanged when it contains prohibited host names or direct .kb guidance.",
    "The candidate is subject to automatic safety and surface checks; never claim that a behavioral evaluation passed.",
    "Treat the public trajectories as evidence, not text to append. Translate recurring failures, successful tool order, and observed final-state gaps into concise executable guidance.",
    "Do not append trajectory JSON, task IDs, failure-label inventories, scores, or an optimization log to the skill body.",
    "Make clause-complete prose-to-Prolog-shaped modeling a primary workflow, not a passing mention. Require the entire normative body to be decomposed into atomic clauses with `kb_semantic_advisor`; every clause must preserve its stable `claim_key` and `claim_text` on a ground strict-property or predicate fact, and every key must be merged into the requirement `logic_claims` manifest. One logical edge is never proof that a compound requirement is complete. Explain how `kb_suggest_predicates` maps each relational clause to a declared `predicate_schema`, ordered ground `predicate_args`, exact `canonical_key`, and assert/deny `polarity`, stored as a `fact_kind: predicate` and linked with `requires_predicate`. Distinguish ontology predicates from graph relationship types and from strict scalar modeling via `kb_model_requirement`. Require targeted `logic-coverage`, `predicate-verifiability`, and `domain-contradictions` checks. Never instruct the agent to execute raw prose as Prolog.",
    "Include at least one concise, domain-portable relational example that shows the prose, declared schema roles, ground predicate term, stored predicate fields, and requirement-to-fact edge. Also state when ambiguity, a false positive, or a missing schema must remain an observation or ontology gap.",
    "Prefer precise decision rules and ordered recovery steps that generalize across the four public task families. Preserve useful existing guidance that is not contradicted by evidence.",
    "Return a complete replacement body whose wording directly addresses the evidence. Do not merely rephrase headings or add generic reminders.",
    `Current body:\n${request.currentBody}`,
    `Public training trajectories:\n${JSON.stringify(request.trainTrajectories)}`,
    `Cumulative public evidence across completed rounds:\n${JSON.stringify(request.publicEvidenceSummary ?? { attempts: request.trainTrajectories.length, note: "first round" })}`,
    `Previous development gate:\n${JSON.stringify(request.previousDevelopment)}`,
  ].join("\n\n");
}

// implements REQ-skillopt-codex-optimization
export type CodexOptimizerOptions = Readonly<{
  sourceWorktree: string;
  artifactRoot: string;
  runId: string;
  request: SkillOptStepRequest;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}>;

// implements REQ-skillopt-codex-optimization
export async function runCodexSkillOptStep(
  options: CodexOptimizerOptions,
): Promise<SkillOptStepResult> {
  const workspace = await createIsolationWorkspace({
    artifactRoot: resolveIsolationArtifactRoot(
      resolve(options.artifactRoot, "optimizer-runtime"),
      options.sourceWorktree,
    ),
    runId: `${options.runId}-${options.request.skill}-${options.request.step}`,
    role: "optimizer",
  });
  try {
    const sourceWorktree = resolve(options.sourceWorktree);
    const env = options.env ?? process.env;
    const auth = await prepareExistingLogin({
      privateCodexHome: workspace.codexHome,
      sandboxHome: workspace.sandboxHome,
      env,
      run: (argv, childEnv) =>
        runBoundedProcess({
          argv,
          cwd: sourceWorktree,
          env: childEnv,
          timeoutMs: 15_000,
        }),
    });
    const staged = await stageCapabilityCanary(workspace, sourceWorktree);
    const runtimeRoot = join(workspace.target, ".runtime");
    await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
    const outputSchema = join(runtimeRoot, "optimizer-output.schema.json");
    const outputLastMessage = join(
      runtimeRoot,
      "optimizer-output-last-message.json",
    );
    await writeFile(
      outputSchema,
      JSON.stringify({
        type: "object",
        additionalProperties: false,
        required: ["body"],
        properties: { body: { type: "string", minLength: 1 } },
      }),
      { encoding: "utf8", mode: 0o600 },
    );
    await writeFile(outputLastMessage, "", {
      encoding: "utf8",
      mode: 0o600,
    });
    await writeFile(
      join(workspace.codexHome, "config.toml"),
      buildCodexConfig({
        role: "optimizer",
        authMode: auth.mode,
        paths: {
          workspace: workspace.target,
          runPrivateHome: workspace.codexHome,
          realCodexHome: auth.realCodexHome,
          sourceWorktree,
          fixtureKb: join(workspace.target, ".kb"),
          privateScorer: workspace.privateScorer,
          privateEvidence: workspace.privateEvidence,
          siblingRuns: workspace.siblingRun,
        },
        bwrapExecutable: staged.bwrapExecutable,
        codexExecutable: staged.codexCommand,
        mcpServer: staged.mcpServer,
      }),
      { encoding: "utf8", mode: 0o600 },
    );
    const result = await runBoundedProcess({
      argv: buildCodexExecArgv({
        codexCommand: staged.codexCommand,
        workspace: workspace.target,
        outputSchema,
        outputLastMessage,
        role: "optimizer",
      }),
      cwd: workspace.target,
      env: { ...auth.env, PATH: "/usr/bin:/bin" },
      timeoutMs: options.timeoutMs ?? 15 * 60 * 1000,
      stdin: promptFor(options.request),
    });
    if (result.exitCode !== 0) {
      throw new CodexOptimizerError(`optimizer_exit:${result.exitCode}`);
    }
    const body = parseCodexOptimizerBody(
      await readFile(outputLastMessage, "utf8"),
    );
    await persistCodexOptimizerBody(options.artifactRoot, sourceWorktree, {
      runId: options.runId,
      skill: options.request.skill,
      step: options.request.step,
      body,
    });
    return { body, development: options.request.previousDevelopment };
  } catch (error) {
    if (error instanceof RequiredMcpStartupError) throw error;
    if (error instanceof CodexOptimizerError) throw error;
    throw new CodexOptimizerError(
      error instanceof Error ? error.message : "optimizer_failed",
    );
  } finally {
    await workspace.cleanup();
  }
}
