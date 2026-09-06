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
  "semantic_inventory",
  "claim_key",
  "claim_text",
  "propositions",
  "interpretations",
  "projectLocalSchemas",
  "nonlogical",
  "review:ambiguity",
  "review:ontology-gap",
  "polarity: deny",
  "kibi.logic.v1",
  "fact_kind: rule_schema",
  "fact_kind: rule",
  "requires_rule",
  "rule-safety",
  "rule-verifiability",
  "semantic-completeness",
  "logic-coverage",
  "taskOutcome",
  "kbState",
  "verificationState",
  "proofState",
  "limitationDisposition",
  "quality diagnostic",
  "fixed",
  "accepted",
  "deferred",
  "contract hash",
  "freshness window",
  "temporary",
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
    "Optimize for the paid development gate, not partial-credit wording: a candidate must reach mean >= 0.85, at least 3 hard passes out of 4, and worst-family mean >= 0.75, while improving on the stronger baseline/one-shot comparator. Preserve hard passes and the weakest family when adding prose; a soft-score increase that leaves hard passes unchanged is not an improvement.",
    "Do not append trajectory JSON, task IDs, failure-label inventories, scores, or an optimization log to the skill body.",
    "Make clause-complete prose-to-verified-logic modeling a primary workflow, not a passing mention. Require an extraction pass and an adversarial coverage-audit pass with `kb_semantic_advisor`; its `propositions` ledger must bind every assertive span to exact text and UTF-8 byte spans, classify rationale/examples/subjective prose as nonlogical, and mark every other proposition modeled, ambiguous, ontology_gap, or missing. Submit up to three typed `interpretations` when a clause has plausible alternatives; canonical semantic keys and structural comparison must keep materially different meanings unresolved regardless of confidence. For ground scalar claims use strict property facts; for relational claims use `kb_suggest_predicates` and a declared `predicate_schema`; for conditions, exceptions, quantifiers, deontic modalities, cardinality, and bounded temporal relationships use validated `kibi.logic.v1` IR through `kb_model_requirement`, persisted as `fact_kind: rule_schema` plus `fact_kind: rule` and linked with `requires_rule`. Every modeled proposition must preserve its stable `claim_key` and `claim_text` on exactly one ground fact or safe rule, and every key must be merged into `logic_claims`; never let one edge suppress the remaining clauses. Explain the typed IR safety boundary: no raw Prolog, function symbols, goals, cuts, meta-calls, dynamic predicates, I/O, unsafe variables, unstratified negation, or unbounded aggregation. Equivalent claims converge on a canonical semantic key while provenance keys remain auditable. Require `rule-safety`, `rule-verifiability`, `semantic-completeness`, `logic-coverage`, `predicate-verifiability`, and `domain-contradictions`; contradictions include opposing modalities over overlapping context, while unresolved or resource-limited analysis is not evidence of consistency. Never instruct the agent to execute raw prose as Prolog.",
    "Preserve hard lane gates: advisor `nonlogical`/`subjective` propositions remain one observation without a logic claim; `ambiguous` remains an ambiguity observation; `ontology_gap` is unresolved unless an approved schema or validated IR exists. When authorized input supplies `projectLocalSchemas`, create its minimal schema endpoint and rerun predicate lookup after an empty pre-schema lookup; do not let a lookup miss override the supplied schema. Use one complete relation and one claim key, and map `must not`, `never`, `cannot`, and `forbidden` to `polarity: deny` on the positive schema. Never split schema arguments or subjective prose into synthetic clauses, and never downgrade a fitting declared schema to an observation.",
    "Include at least one concise, domain-portable relational example that shows the prose, declared schema roles, ground predicate term, stored predicate fields, and requirement-to-fact edge. Also state when ambiguity, a false positive, or a missing schema must remain an observation or ontology gap.",
    "Prefer precise decision rules and ordered recovery steps that generalize across the four public task families. Require exact readback of every repeated relationship target, including array-valued query fields, and require an unfiltered final check after the last write. Preserve useful existing guidance that is not contradicted by evidence.",
    "Require a structured five-axis closeout with taskOutcome, kbState, verificationState, proofState, and limitationDisposition. Keep zero blocking separate from stale/dirty/legacy KB state, and keep unresolved proof separate from whether the requested maintenance task completed. Require an ID-specific fixed, accepted, or deferred disposition with rationale for every quality diagnostic. Reuse receipts only when live snapshot, contract hash, freshness window, and required case results are unchanged. Treat same-version export drift as a release defect requiring a new package version; project dependency overrides are temporary. Never select a package manager or edit dependency configuration.",
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
  codexExecutable?: string;
  bwrapExecutable?: string;
  timeoutMs?: number;
}>;

export function defaultCodexLoginRun(
  argv: string[],
  childEnv: NodeJS.ProcessEnv,
  sourceWorktree: string,
): ReturnType<typeof runBoundedProcess> {
  return runBoundedProcess({
    argv,
    cwd: sourceWorktree,
    env: childEnv,
    timeoutMs: 15_000,
  });
}

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
        defaultCodexLoginRun(argv, childEnv, sourceWorktree),
    });
    const staged = await stageCapabilityCanary(workspace, sourceWorktree, {
      ...(options.codexExecutable === undefined
        ? {}
        : { codexExecutable: options.codexExecutable }),
      ...(options.bwrapExecutable === undefined
        ? {}
        : { systemBwrapExecutable: options.bwrapExecutable }),
      ...(options.codexExecutable !== undefined &&
      options.bwrapExecutable !== undefined
        ? {
            stagedRuntime: {
              codexExecutable: options.codexExecutable,
              bwrapExecutable: options.bwrapExecutable,
            },
          }
        : {}),
    });
    // `.runtime` is intentionally read-only inside the Codex sandbox: it
    // contains the staged executable, broker, and the canary schema. Keep the
    // optimizer's response contract at the workspace root, whose write access
    // is explicitly granted by the isolated permission profile. Otherwise the
    // optimizer can fail before producing a result when Codex tries to open its
    // response schema/message files through bwrap.
    const outputSchema = join(
      workspace.target,
      ".optimizer-output.schema.json",
    );
    const outputLastMessage = join(
      workspace.target,
      ".optimizer-output-last-message.json",
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
      const stderrTail = result.stderr.trim().split("\n").slice(-6).join(" | ");
      throw new CodexOptimizerError(
        `optimizer_exit:${result.exitCode}${stderrTail ? `:${stderrTail.slice(0, 600)}` : ""}`,
      );
    }
    const output = await readFile(outputLastMessage, "utf8");
    let body: string;
    try {
      body = parseCodexOptimizerBody(output);
    } catch (error) {
      if (
        !(error instanceof CodexOptimizerError) ||
        error.message !== "optimizer_output_incomplete_body"
      )
        throw error;
      const parsed = BodySchema.safeParse(parseJson(output));
      if (!parsed.success) throw error;
      const candidateBody = parsed.data.body;
      validateCandidateBody(candidateBody);
      if (
        Buffer.byteLength(candidateBody, "utf8") < MIN_COMPLETE_BODY_BYTES ||
        REPOSITORY_POLICY_LEAKS.some((pattern) => pattern.test(candidateBody))
      )
        throw error;
      const missing = REQUIRED_BODY_GUIDANCE.filter(
        (guidance) => !candidateBody.includes(guidance),
      );
      body =
        missing.length === 0
          ? candidateBody
          : `${candidateBody.trim()}\n\n## Required Kibi logic contract\n\n${missing.join(" · ")}\n`;
      validateCandidateBody(body);
    }
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
