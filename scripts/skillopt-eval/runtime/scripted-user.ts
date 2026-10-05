import { isDeepStrictEqual } from "node:util";
import { bootstrapPlanHash } from "../../../packages/cli/src/operations/bootstrap/types";
import { z } from "zod";

// implements REQ-skillopt-codex-optimization
export const ScriptedUserProfileSchema = z
  .object({
    mode: z.enum(["approve", "decline"]),
    contextAnswer: z.string().min(1),
    bootstrapContext: z
      .object({
        projectSummary: z.string().min(1),
        knowledgeSources: z
          .array(
            z
              .object({
                id: z.string(),
                kind: z.literal("specification"),
                title: z.string(),
                locator: z.string(),
                authority: z.literal("authoritative"),
              })
              .strict(),
          )
          .length(1),
        intentClaims: z
          .array(
            z
              .object({
                sourceId: z.string(),
                reference: z.string(),
                statement: z.string().min(1),
              })
              .strict(),
          )
          .length(1),
      })
      .strict(),
  })
  .strict();

// implements REQ-skillopt-codex-optimization
export const SCRIPTED_USER_TOOL = {
  name: "skillopt_ask_user",
  description:
    "Ask the fixture operator a question and continue with the answer. Context provides project intent and source authority. Approval requires a preview from kb_plan_bootstrap and its exact planHash. Unknown clarifications receive no invented facts. Maximum four exchanges.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["topic", "question"],
    properties: {
      topic: { type: "string", enum: ["context", "approval", "clarification"] },
      question: { type: "string", minLength: 1, maxLength: 4000 },
      planHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
    },
  },
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Host-owned state; never accepts a target-authored plan as an approval preview. */
// implements REQ-skillopt-codex-optimization
export class ScriptedUser {
  private exchanges = 0;
  private generation = 0;
  private attempted = new Set<unknown>();
  private preview: Record<string, unknown> | undefined;
  private approved: Record<string, unknown> | undefined;

  constructor(
    private readonly profile: z.infer<typeof ScriptedUserProfileSchema>,
  ) {}

  beginPlan(): number {
    this.preview = undefined;
    // Suspend writes while planning. Re-reading an identical approved plan
    // does not withdraw the user's consent; only a changed/failed result does.
    return ++this.generation;
  }

  observePlan(
    args: Record<string, unknown>,
    response: Record<string, unknown>,
    generation: number,
  ): void {
    if (generation !== this.generation) return;
    const priorApproval = this.approved;
    this.approved = undefined;
    const result = response.result;
    const envelope =
      record(result) && result.isError !== true
        ? result.structuredContent
        : undefined;
    const data =
      record(envelope) && envelope.status === "success"
        ? envelope.data
        : undefined;
    const plan = record(data) ? data.plan : undefined;
    if (
      !record(plan) ||
      plan.status !== "ready" ||
      plan.planHash !== bootstrapPlanHash(plan)
    )
      return;
    // The user approves only their one cited obligation plus repository observations.
    const context = args.bootstrapContext;
    const sources =
      record(context) && Array.isArray(context.knowledgeSources)
        ? context.knowledgeSources.filter(record)
        : [];
    const claims =
      record(context) && Array.isArray(context.intentClaims)
        ? context.intentClaims.filter(record)
        : [];
    // The model chooses source IDs and summarizes the project after reading the
    // document. Approval checks the cited authority and obligation, not those IDs.
    if (
      claims.length !== 1 ||
      claims[0]?.statement !==
        this.profile.bootstrapContext.intentClaims[0]?.statement ||
      !sources.some(
        (source) =>
          source.id === claims[0]?.sourceId &&
          source.authority === "authoritative" &&
          typeof source.locator === "string" &&
          source.locator.replace(/^\.\//, "") ===
            this.profile.bootstrapContext.knowledgeSources[0]?.locator,
      )
    )
      return;
    if (
      !Array.isArray(plan.candidates) ||
      !Array.isArray(plan.sourceWrites) ||
      plan.sourceWrites.length !== 0
    )
      return;
    const requirements = plan.candidates.filter(
      (candidate) => record(candidate) && candidate.entityType === "req",
    );
    if (
      requirements.length !== 1 ||
      requirements[0].sourceKind !== "intent_claim" ||
      requirements[0].title !==
        this.profile.bootstrapContext.intentClaims[0]?.statement
    )
      return;
    if (
      !plan.candidates.every(
        (candidate) =>
          record(candidate) &&
          (candidate === requirements[0] ||
            (candidate.entityType === "fact" &&
              ["repo_metadata", "repo_layout", "source_symbols"].includes(
                String(candidate.sourceKind),
              ))),
      )
    )
      return;
    this.preview = structuredClone(plan);
    if (isDeepStrictEqual(priorApproval, plan)) this.approved = priorApproval;
  }

  answer(args: Record<string, unknown>): Record<string, unknown> {
    this.exchanges += 1;
    if (this.exchanges > 4)
      return {
        status: "exhausted",
        answer:
          "No further user exchanges are available. Report unresolved questions; do not assume approval.",
      };
    if (
      typeof args.question !== "string" ||
      !args.question.trim() ||
      args.question.length > 4000 ||
      Object.keys(args).some(
        (key) => !["topic", "question", "planHash"].includes(key),
      )
    )
      return {
        status: "invalid",
        answer: "Provide a bounded question and a supported topic.",
      };
    if (args.topic === "context")
      return {
        status: "answered",
        actor: "fixture-operator",
        answer: this.profile.contextAnswer,
      };
    if (args.topic === "approval") {
      this.approved = undefined;
      if (this.profile.mode === "decline")
        return {
          status: "declined",
          answer: "Keep this exercise read-only. Do not apply the plan.",
        };
      if (
        !this.preview ||
        args.planHash !== this.preview.planHash ||
        this.attempted.has(args.planHash)
      )
        return {
          status: "declined",
          answer:
            "I cannot approve this: provide the exact hash of a ready, in-scope planner preview.",
        };
      this.approved = structuredClone(this.preview);
      return {
        status: "approved",
        actor: "fixture-operator",
        approvedPlanHash: this.approved.planHash,
        answer:
          "I approve only this unchanged plan in this disposable fixture.",
      };
    }
    return {
      status: "unknown",
      answer:
        "I do not know. Keep the uncertainty explicit; do not invent project facts or approval.",
    };
  }

  permits(tool: string, args: Record<string, unknown>): boolean {
    if (tool === "kb_apply_plan") {
      const allowed =
        this.preview !== undefined &&
        this.approved !== undefined &&
        args.approvedPlanHash === this.approved.planHash &&
        isDeepStrictEqual(args.plan, this.approved);
      if (allowed) this.attempted.add(args.approvedPlanHash);
      this.approved = undefined; // One authorization, one attempt, including repair outcomes.
      return allowed;
    }
    if (tool === "kb_upsert") return args.dryRun === true;
    return !["kb_delete", "kb_ingest_proof"].includes(tool);
  }
}
