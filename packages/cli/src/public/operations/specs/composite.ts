import type { OperationContext } from "../runtime-types.js";
import type { OperationResult, OperationSpec } from "../types.js";
import { modelRequirementSpec, suggestPredicatesSpec } from "./modeling.js";
import { semanticAdvisorSpec } from "./semantic.js";
import { skillsListSpec, skillsLoadSpec, skillsReadSpec } from "./skills.js";

// implements REQ-kibi-mcp-tool-consolidation
/**
 * Composite operations keep the agent-facing tool list short. Each one
 * dispatches to an existing operation by `action` or `mode` and returns that
 * operation's payload unchanged plus the selector, so the narrower CLI routes
 * and the composite tool always agree.
 */
type Executor = (input: never, context: OperationContext) => Promise<unknown>;

function properties(spec: {
  readonly businessInputSchema: Readonly<Record<string, unknown>>;
}): Readonly<Record<string, unknown>> {
  const props = spec.businessInputSchema.properties;
  return props && typeof props === "object"
    ? (props as Readonly<Record<string, unknown>>)
    : {};
}

function requiredFields(spec: {
  readonly businessInputSchema: Readonly<Record<string, unknown>>;
}): readonly string[] {
  const required = spec.businessInputSchema.required;
  return Array.isArray(required) ? (required as string[]) : [];
}

export async function dispatchComposite(
  selector: "action" | "mode",
  routes: Readonly<
    Record<
      string,
      {
        readonly execute: Executor;
        readonly businessInputSchema: Readonly<Record<string, unknown>>;
      }
    >
  >,
  input: Readonly<Record<string, unknown>>,
  context: OperationContext,
): Promise<OperationResult<Record<string, unknown>>> {
  const choice = input[selector];
  const route = typeof choice === "string" ? routes[choice] : undefined;
  if (route === undefined) {
    throw new Error(
      `${selector} must be one of: ${Object.keys(routes).join(", ")}`,
    );
  }
  const { [selector]: _selector, ...rest } = input;
  for (const field of requiredFields(route)) {
    if (rest[field] === undefined) {
      throw new Error(`${field} is required when ${selector} is ${choice}`);
    }
  }
  const result = await route.execute(rest as never, context);
  // Routed executors return an OperationResult; host adapters may hand back
  // the bare payload, which is used as-is.
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const wrapped =
    isRecord(result) && ("structuredContent" in result || "content" in result);
  const structured = wrapped ? result.structuredContent : result;
  const payload = isRecord(structured) ? structured : {};
  const content =
    wrapped && Array.isArray(result.content)
      ? (result.content as OperationResult["content"])
      : [{ type: "text", text: `${selector} ${String(choice)} completed` }];
  return {
    content,
    structuredContent: { [selector]: choice, ...payload },
  };
}

// implements REQ-kibi-mcp-tool-consolidation
export const SKILL_ROUTES = {
  list: skillsListSpec,
  load: skillsLoadSpec,
  read: skillsReadSpec,
} as const;

// implements REQ-kibi-mcp-tool-consolidation
export const MODEL_ROUTES = {
  analyze: semanticAdvisorSpec,
  requirement: modelRequirementSpec,
  predicates: suggestPredicatesSpec,
} as const;

// implements REQ-kibi-mcp-tool-consolidation
export const skillsSpec = {
  name: "kb_skills",
  cliName: "skill",
  description:
    "Read bundled Kibi agent skills (workflow guidance). action:list returns the catalog; action:load returns a skill's metadata, Markdown body, declared resources and content hash (start with id 'kibi-usage'); action:read returns one manifest-declared resource. Read-only; does not require Prolog.",
  businessInputSchema: {
    type: "object",
    required: ["action"],
    properties: {
      action: {
        type: "string",
        enum: ["list", "load", "read"],
        description: "list, load (needs id) or read (needs id and resource).",
      },
      ...properties(skillsReadSpec),
    },
  },
  requiresProlog: false,
  effects: ["local-read"],
  execute: (input, context) =>
    dispatchComposite("action", SKILL_ROUTES, input, context),
} as const satisfies OperationSpec;

// implements REQ-kibi-mcp-tool-consolidation
export const modelSpec = {
  name: "kb_model",
  cliName: "model",
  description:
    "Turn requirement prose into checkable structure without writing the KB. mode:analyze returns the semantic advisor receipt: the clause ledger, what is grounded, what is ambiguous and suggested modeling (pass clauses for compound prose and optional typed kibi.logic.v1 interpretations). mode:requirement converts one claim (subjectKey, propertyKey, operator, value, or typed logic) into a strict-lane write set and applyPlan. mode:predicates ranks ontology predicate schemas and returns an applicable predicate-fact plan only for reviewed bindings, otherwise an ontology-gap observation. Apply returned plans with kb_upsert.",
  businessInputSchema: {
    type: "object",
    required: ["mode", "text"],
    properties: {
      mode: {
        type: "string",
        enum: ["analyze", "requirement", "predicates"],
        description:
          "analyze (advisor receipt), requirement (strict claim write set) or predicates (ontology predicate plan).",
      },
      ...properties(semanticAdvisorSpec),
      ...properties(suggestPredicatesSpec),
      ...properties(modelRequirementSpec),
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  execute: (input, context) =>
    dispatchComposite("mode", MODEL_ROUTES, input, context),
} as const satisfies OperationSpec;
