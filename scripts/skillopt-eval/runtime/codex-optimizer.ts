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
import { withPreparedLogin } from "./codex-auth";
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
export function missingRequiredGuidance(body: string): readonly string[] {
  return REQUIRED_BODY_GUIDANCE.filter((guidance) => !body.includes(guidance));
}

function isRepairableOptimizerError(error: CodexOptimizerError): boolean {
  return (
    error.message === "optimizer_output_missing_body" ||
    error.message === "optimizer_output_incomplete_body"
  );
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
    missingRequiredGuidance(body).length > 0
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

// implements REQ-skillopt-codex-optimization
export async function persistCodexOptimizerFailure(
  artifactRoot: string,
  sourceWorktree: string,
  input: Readonly<{
    runId: string;
    skill: string;
    step: number;
    attempt: number;
    error: string;
    lastMessage: string;
    exitCode: number;
    stderrTail: string;
  }>,
): Promise<void> {
  const failedRoot = resolveIsolationArtifactRoot(
    resolve(artifactRoot, "failed-output", `attempt-${input.attempt}`),
    sourceWorktree,
  );
  await mkdir(failedRoot, { recursive: true, mode: 0o700 });
  const parsed = BodySchema.safeParse(parseJson(input.lastMessage));
  const missingGuidance = parsed.success
    ? missingRequiredGuidance(parsed.data.body)
    : [];
  await writeFile(join(failedRoot, "last-message.txt"), input.lastMessage, {
    encoding: "utf8",
    mode: 0o600,
  });
  await writeFile(
    join(failedRoot, "parse-error.json"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-failed-optimizer-output",
      runId: input.runId,
      skill: input.skill,
      step: input.step,
      attempt: input.attempt,
      error: input.error,
      missingGuidance,
      lastMessageBytes: Buffer.byteLength(input.lastMessage, "utf8"),
      exitCode: input.exitCode,
      stderrTail: input.stderrTail,
    })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
}

function repairPromptFor(
  request: SkillOptStepRequest,
  lastMessage: string,
  error: CodexOptimizerError,
): string {
  if (error.message === "optimizer_output_missing_body") {
    return [
      "Return one JSON object with exactly one string field named body.",
      "Your previous response was not valid JSON with a body field.",
      "Rewrite only the skill body. Do not include Markdown frontmatter.",
      "Do not append a dummy section titled Required Kibi logic contract.",
      `Previous output:\n${lastMessage}`,
      `Current body:\n${request.currentBody}`,
    ].join("\n\n");
  }
  const parsed = BodySchema.safeParse(parseJson(lastMessage));
  const previousBody = parsed.success ? parsed.data.body : lastMessage;
  const missing = missingRequiredGuidance(previousBody);
  return [
    "Return one JSON object with exactly one string field named body.",
    "Start from your previous skill body. Insert each missing exact phrase into real prose sections where it belongs.",
    "Do not append a dummy section titled Required Kibi logic contract.",
    "Do not join missing phrases with a middle-dot list.",
    `Missing exact phrases:\n${missing.map((phrase) => `- ${phrase}`).join("\n")}`,
    `Previous body:\n${previousBody}`,
  ].join("\n\n");
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

export function loginRunForSource(
  sourceWorktree: string,
): (
  argv: readonly [string, ...string[]],
  childEnv: NodeJS.ProcessEnv,
) => ReturnType<typeof runBoundedProcess> {
  return (argv, childEnv) =>
    defaultCodexLoginRun(argv, childEnv, sourceWorktree);
}

export function defaultCodexLoginRun(
  argv: readonly [string, ...string[]],
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
    return await withPreparedLogin(
      {
        privateCodexHome: workspace.codexHome,
        sandboxHome: workspace.sandboxHome,
        env,
        run: loginRunForSource(sourceWorktree),
      },
      async (auth) => {
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
    const execArgv = buildCodexExecArgv({
      codexCommand: staged.codexCommand,
      workspace: workspace.target,
      outputSchema,
      outputLastMessage,
      role: "optimizer",
    });
    const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000;
    const runAttempt = async (stdin: string) => {
      await writeFile(outputLastMessage, "", {
        encoding: "utf8",
        mode: 0o600,
      });
      const result = await runBoundedProcess({
        argv: execArgv,
        cwd: workspace.target,
        env: { ...auth.env, PATH: "/usr/bin:/bin" },
        timeoutMs,
        stdin,
      });
      const lastMessage = await readFile(outputLastMessage, "utf8").catch(
        () => "",
      );
      return { result, lastMessage };
    };
    const interpretAttempt = (
      result: { exitCode: number; stderr: string },
      lastMessage: string,
    ):
      | { ok: true; body: string; result: { exitCode: number; stderr: string }; lastMessage: string }
      | {
          ok: false;
          error: CodexOptimizerError;
          result: { exitCode: number; stderr: string };
          lastMessage: string;
        } => {
      if (result.exitCode !== 0) {
        const stderrTail = result.stderr
          .trim()
          .split("\n")
          .slice(-6)
          .join(" | ");
        return {
          ok: false,
          error: new CodexOptimizerError(
            `optimizer_exit:${result.exitCode}${stderrTail ? `:${stderrTail.slice(0, 600)}` : ""}`,
          ),
          result,
          lastMessage,
        };
      }
      try {
        return {
          ok: true,
          body: parseCodexOptimizerBody(lastMessage),
          result,
          lastMessage,
        };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof CodexOptimizerError
              ? error
              : new CodexOptimizerError(
                  error instanceof Error ? error.message : "optimizer_failed",
                ),
          result,
          lastMessage,
        };
      }
    };
    const persistFailure = async (
      attempt: number,
      error: CodexOptimizerError,
      result: { exitCode: number; stderr: string },
      lastMessage: string,
    ) => {
      const stderrTail = result.stderr.trim().split("\n").slice(-6).join(" | ");
      await persistCodexOptimizerFailure(
        options.artifactRoot,
        sourceWorktree,
        {
          runId: options.runId,
          skill: options.request.skill,
          step: options.request.step,
          attempt,
          error: error.message,
          lastMessage,
          exitCode: result.exitCode,
          stderrTail: stderrTail.slice(0, 600),
        },
      );
    };

    let attempt = await runAttempt(promptFor(options.request));
    let interpreted = interpretAttempt(attempt.result, attempt.lastMessage);
    if (!interpreted.ok) {
      await persistFailure(
        1,
        interpreted.error,
        interpreted.result,
        interpreted.lastMessage,
      );
      if (isRepairableOptimizerError(interpreted.error)) {
        attempt = await runAttempt(
          repairPromptFor(
            options.request,
            interpreted.lastMessage,
            interpreted.error,
          ),
        );
        interpreted = interpretAttempt(attempt.result, attempt.lastMessage);
        if (!interpreted.ok) {
          await persistFailure(
            2,
            interpreted.error,
            interpreted.result,
            interpreted.lastMessage,
          );
          throw interpreted.error;
        }
      } else {
        throw interpreted.error;
      }
    }
    await persistCodexOptimizerBody(options.artifactRoot, sourceWorktree, {
      runId: options.runId,
      skill: options.request.skill,
      step: options.request.step,
      body: interpreted.body,
    });
    return {
      body: interpreted.body,
      development: options.request.previousDevelopment,
    };
      },
    );
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
