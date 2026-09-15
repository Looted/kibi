import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  type BaselineInsertionComposition,
  type BaselineInsertionPlan,
  BaselineInsertionValidationError,
  MAX_BASELINE_INSERTION_PARAGRAPH_BYTES,
  composeBaselineInsertion,
  validateBaselineInsertionAnchor,
  validateBaselineInsertionParagraph,
  validateBaselineInsertionPlan,
} from "../baseline-insertion";
import {
  CodexOptimizerError,
  missingRequiredGuidance,
  validateCompleteCandidateBody,
} from "../candidate-body";
import type { SkillOptStepRequest, SkillOptStepResult } from "../optimize";
import { sha256Text } from "../variants";
export { CodexOptimizerError, missingRequiredGuidance };
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

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

function isRepairableOptimizerError(error: CodexOptimizerError): boolean {
  return (
    error.message === "optimizer_output_missing_body" ||
    error.message === "optimizer_output_incomplete_body"
  );
}

function isRepairableBaselineInsertionError(
  error: CodexOptimizerError,
): boolean {
  return [
    "optimizer_output_missing_body",
    "baseline_insertion_paragraph_too_large",
    "baseline_insertion_multiple_paragraphs",
    "baseline_insertion_non_paragraph",
    "baseline_insertion_fence",
    "baseline_insertion_header",
  ].includes(error.message);
}

// implements REQ-skillopt-codex-optimization
export function parseCodexOptimizerBody(lastMessage: string): string {
  const parsed = BodySchema.safeParse(parseJson(lastMessage));
  if (!parsed.success) {
    throw new CodexOptimizerError("optimizer_output_missing_body");
  }
  const body = parsed.data.body;
  validateCompleteCandidateBody(body);
  return body;
}

// implements REQ-skillopt-codex-optimization
export function parseBaselineInsertionParagraph(
  lastMessage: string,
  plan: BaselineInsertionPlan,
): string {
  const parsed = BodySchema.safeParse(parseJson(lastMessage));
  if (!parsed.success) {
    throw new CodexOptimizerError("optimizer_output_missing_body");
  }
  try {
    validateBaselineInsertionParagraph(parsed.data.body, plan);
  } catch (error) {
    if (error instanceof BaselineInsertionValidationError) {
      throw new CodexOptimizerError(error.message);
    }
    throw error;
  }
  return parsed.data.body;
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
export async function persistBaselineInsertionArtifacts(
  artifactRoot: string,
  sourceWorktree: string,
  input: Readonly<{
    runId: string;
    skill: string;
    step: number;
    baselineBody: string;
    plan: BaselineInsertionPlan;
    composition: BaselineInsertionComposition;
  }>,
): Promise<void> {
  const acceptedRoot = resolveIsolationArtifactRoot(
    resolve(artifactRoot, "accepted-output"),
    sourceWorktree,
  );
  await mkdir(acceptedRoot, { recursive: true, mode: 0o700 });
  await writeFile(
    join(acceptedRoot, "model-paragraph.md"),
    input.composition.paragraph,
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
  await writeFile(join(acceptedRoot, "baseline-body.md"), input.baselineBody, {
    encoding: "utf8",
    mode: 0o600,
  });
  await writeFile(
    join(acceptedRoot, "composed-body.md"),
    input.composition.composedBody,
    { encoding: "utf8", mode: 0o600 },
  );
  await writeFile(
    join(acceptedRoot, "baseline-insertion-plan.json"),
    `${JSON.stringify(input.plan)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await writeFile(
    join(acceptedRoot, "composition-receipt.json"),
    `${JSON.stringify(input.composition.receipt)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await writeFile(
    join(acceptedRoot, "receipt.json"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      artifactType: "skillopt-accepted-baseline-insertion-output",
      mode: "baseline-insertion",
      runId: input.runId,
      skill: input.skill,
      step: input.step,
      bodyKind: "composed",
      bodyPath: "composed-body.md",
      modelParagraphPath: "model-paragraph.md",
      baselineBodyPath: "baseline-body.md",
      planPath: "baseline-insertion-plan.json",
      compositionReceiptPath: "composition-receipt.json",
      bodyHash: input.composition.receipt.composedBodyHash,
      bodyBytes: input.composition.receipt.composedBodyBytes,
      modelParagraphHash: input.composition.receipt.paragraphHash,
      modelParagraphBytes: input.composition.receipt.paragraphBytes,
      baselineBodyHash: input.composition.receipt.baselineBodyHash,
      currentBaselineBodyHash:
        input.composition.receipt.currentBaselineBodyHash,
      baselineBodyBytes: input.composition.receipt.baselineBodyBytes,
      frontmatterHash: input.composition.receipt.frontmatterHash,
      resourcesHash: input.composition.receipt.resourcesHash,
      headingAnchor: input.composition.receipt.headingAnchor,
      objectiveHash: input.composition.receipt.objectiveHash,
      composedBodyHash: input.composition.receipt.composedBodyHash,
      composedBodyBytes: input.composition.receipt.composedBodyBytes,
      insertionHash: input.composition.receipt.insertionHash,
      insertionBytes: input.composition.receipt.insertionBytes,
      planHash: input.composition.receipt.planHash,
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
    "Treat the public trajectories as historical optimization evidence, not text to append or independent evaluator evidence; they are never private or held-out evidence. Translate recurring failures, successful tool order, and observed final-state gaps into concise executable guidance.",
    "Optimize against the baseline development result, not the one-shot result. Allow partial-score gains: admission is a mean improvement over baseline with no hard-pass or worst-family regression and zero security failures, without absolute mean, hard-pass, or worst-family floors. A soft-score gain without a new hard or family loss is a valid improvement; preserve all required guidance while making that change. One-shot remains diagnostic and may initialize the trainer when stronger; do not discard a winning one-shot.",
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

function baselineInsertionPromptFor(
  request: SkillOptStepRequest,
  plan: BaselineInsertionPlan,
): string {
  return [
    "Return one JSON object with exactly one string field named body.",
    "The body value must be exactly one short prose paragraph, not a replacement skill body.",
    `Keep the paragraph at or below ${MAX_BASELINE_INSERTION_PARAGRAPH_BYTES} UTF-8 bytes. Do not use a Markdown heading, blank-line paragraph break, fenced code block, indented code, or list.`,
    "Follow the operator objective as a small, scoped addition to the unchanged baseline. Preserve its existing typed-result recovery. For authorized mutation guidance, preserve the actual supplied target and intended edges, discover and query those targets, validate the same payload, perform the authorized same-payload kb_upsert, and exact-read back the result before final checks. Distinct authorized payloads may require multiple sequential writes; never impose a global one-write limit or retry an already committed mutation.",
    "Validation is not completion. The operator objective below is prompt-only: use it to guide portable wording, but do not quote or copy it into the paragraph. Do not include fixture IDs, task or run IDs, scores, evaluator/private evidence, or optimization notes in the paragraph. Do not invent arbitrary deletion/replacement operations or user-change anchors. Do not claim behavioral efficacy, evaluation success, or production adoption.",
    "The paragraph must pass the existing shallow candidate safety and repository-policy checks. Do not mention hosts, provider SDKs, API keys, release policy, or direct .kb access.",
    `Insertion anchor (host-owned and not model-editable): ${plan.headingAnchor}`,
    `Operator objective (prompt-only; hash-bound in the receipt): ${plan.objective}`,
    `Public historical feedback (observations and labelled hypotheses, not current evaluation results; never copy its identifiers into the paragraph):\n${JSON.stringify(request.trainTrajectories)}`,
    `Current baseline body is supplied for context only; do not rewrite it:\n${request.currentBody}`,
  ].join("\n\n");
}

function baselineInsertionRepairPromptFor(
  request: SkillOptStepRequest,
  plan: BaselineInsertionPlan,
  lastMessage: string,
  error: CodexOptimizerError,
): string {
  return [
    "Return one JSON object with exactly one string field named body.",
    "Repair output format only. Return exactly one short portable prose paragraph, with no Markdown heading, blank-line paragraph break, fenced or indented code block, or list.",
    `Keep the paragraph at or below ${MAX_BASELINE_INSERTION_PARAGRAPH_BYTES} UTF-8 bytes. Do not copy fixture, task, run, score, evaluator, private, or optimization metadata; do not change the authorized operation or add arbitrary deletion/replacement operations.`,
    "Preserve the meaning required by the operator objective and the baseline's typed-result recovery. Validation is not completion of an authorized mutation; apply and read back its corrected payload. Distinct authorized payloads may require multiple sequential writes. Repair formatting without dropping schema/claim distinctions or inventing a global one-write limit.",
    `Format failure: ${error.message}`,
    `Previous output:\n${lastMessage}`,
    `Operator objective (prompt-only; hash-bound in the receipt): ${plan.objective}`,
    `Current baseline body is context only:\n${request.currentBody}`,
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
  baselineInsertion?: BaselineInsertionPlan;
}>;
export type { BaselineInsertionPlan } from "../baseline-insertion";

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

type CanonicalSkillSurface = Readonly<{
  body: string;
  frontmatterHash: string;
  resourcesHash: string;
}>;

async function validateBaselineInsertionSource(
  options: CodexOptimizerOptions,
): Promise<CanonicalSkillSurface> {
  const plan = options.baselineInsertion;
  if (plan === undefined) {
    throw new CodexOptimizerError("baseline_insertion_plan_missing");
  }
  try {
    validateBaselineInsertionPlan(plan);
    // real-workflow imports this runtime, so keep this lookup dynamic to avoid
    // making the existing optimizer/runtime module cycle static.
    const { surface } = await import("../real-workflow");
    const actual = await surface(
      resolve(options.sourceWorktree),
      options.request.skill,
    );
    if (
      options.request.currentBody !== actual.body ||
      sha256Text(options.request.currentBody) !==
        plan.currentBaselineBodyHash ||
      sha256Text(actual.body) !== plan.currentBaselineBodyHash ||
      actual.frontmatterHash !== plan.frontmatterHash ||
      actual.resourcesHash !== plan.resourcesHash
    ) {
      throw new CodexOptimizerError("baseline_insertion_source_changed");
    }
    validateBaselineInsertionAnchor(actual.body, plan.headingAnchor);
    return actual;
  } catch (error) {
    if (error instanceof CodexOptimizerError) throw error;
    if (error instanceof BaselineInsertionValidationError) {
      throw new CodexOptimizerError(error.message);
    }
    throw new CodexOptimizerError(
      error instanceof Error
        ? error.message
        : "baseline_insertion_source_invalid",
    );
  }
}

// implements REQ-skillopt-codex-optimization
export async function runCodexSkillOptStep(
  options: CodexOptimizerOptions,
): Promise<SkillOptStepResult> {
  if (options.baselineInsertion !== undefined) {
    await validateBaselineInsertionSource(options);
  }
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
            properties: {
              body: {
                type: "string",
                minLength: 1,
                ...(options.baselineInsertion === undefined
                  ? {}
                  : { maxLength: MAX_BASELINE_INSERTION_PARAGRAPH_BYTES }),
              },
            },
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
          | {
              ok: true;
              body: string;
              result: { exitCode: number; stderr: string };
              lastMessage: string;
            }
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
              body:
                options.baselineInsertion === undefined
                  ? parseCodexOptimizerBody(lastMessage)
                  : parseBaselineInsertionParagraph(
                      lastMessage,
                      options.baselineInsertion,
                    ),
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
                      error instanceof Error
                        ? error.message
                        : "optimizer_failed",
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
          const stderrTail = result.stderr
            .trim()
            .split("\n")
            .slice(-6)
            .join(" | ");
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

        const initialPrompt =
          options.baselineInsertion === undefined
            ? promptFor(options.request)
            : baselineInsertionPromptFor(
                options.request,
                options.baselineInsertion,
              );
        let attempt = await runAttempt(initialPrompt);
        let interpreted = interpretAttempt(attempt.result, attempt.lastMessage);
        if (!interpreted.ok) {
          await persistFailure(
            1,
            interpreted.error,
            interpreted.result,
            interpreted.lastMessage,
          );
          const repairable =
            options.baselineInsertion === undefined
              ? isRepairableOptimizerError(interpreted.error)
              : isRepairableBaselineInsertionError(interpreted.error);
          if (repairable) {
            attempt = await runAttempt(
              options.baselineInsertion === undefined
                ? repairPromptFor(
                    options.request,
                    interpreted.lastMessage,
                    interpreted.error,
                  )
                : baselineInsertionRepairPromptFor(
                    options.request,
                    options.baselineInsertion,
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
        if (options.baselineInsertion !== undefined) {
          const currentSurface = await validateBaselineInsertionSource(options);
          const composition = composeBaselineInsertion({
            baselineBody: currentSurface.body,
            paragraph: interpreted.body,
            plan: options.baselineInsertion,
          });
          await persistBaselineInsertionArtifacts(
            options.artifactRoot,
            sourceWorktree,
            {
              runId: options.runId,
              skill: options.request.skill,
              step: options.request.step,
              baselineBody: currentSurface.body,
              plan: options.baselineInsertion,
              composition,
            },
          );
          return {
            body: composition.composedBody,
            development: options.request.previousDevelopment,
          };
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
