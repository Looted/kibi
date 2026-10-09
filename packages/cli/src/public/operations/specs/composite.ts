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

type CompositeRoute = {
  readonly name?: string;
  readonly execute: Executor;
  readonly businessInputSchema: Readonly<Record<string, unknown>>;
};

/**
 * Per route, the parameters another route of the same composite owns that
 * mean the same thing here under another name. kb_model mode requirement
 * takes the claim's subject as subjectKey; mode predicates takes it as
 * subjectHint.
 */
const EQUIVALENT_PARAMETERS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  kb_suggest_predicates: { subjectKey: "subjectHint" },
  kb_model_requirement: { subjectHint: "subjectKey" },
};

/** Routed operations whose `warnings` are `{ kind, message, nextAction }`. */
const RECORD_WARNING_OPERATIONS = new Set(["kb_model_requirement"]);

// implements REQ-kibi-mcp-tool-consolidation
/**
 * A composite accepts every route's parameters, so a parameter of another
 * route passes schema validation and the chosen route silently ignores it.
 * Name each one instead, with the parameter this route uses for the same
 * thing when there is one.
 */
export function foreignParameterWarnings(
  selector: "action" | "mode",
  choice: string,
  routes: Readonly<Record<string, CompositeRoute>>,
  rest: Readonly<Record<string, unknown>>,
): Array<{ parameter: string; message: string; nextAction: string }> {
  const route = routes[choice];
  if (route === undefined) return [];
  const own = new Set(Object.keys(properties(route)));
  const equivalents =
    route.name === undefined ? {} : (EQUIVALENT_PARAMETERS[route.name] ?? {});
  const warnings: Array<{
    parameter: string;
    message: string;
    nextAction: string;
  }> = [];
  for (const parameter of Object.keys(rest)) {
    if (own.has(parameter) || rest[parameter] === undefined) continue;
    const owners = Object.entries(routes)
      .filter(
        ([other, otherRoute]) =>
          other !== choice && parameter in properties(otherRoute),
      )
      .map(([other]) => `${selector}: ${other}`);
    if (owners.length === 0) continue;
    const equivalent = equivalents[parameter];
    warnings.push({
      parameter,
      message: `${parameter} is a ${owners.join(" / ")} argument; ${selector}: ${choice} ignored it.`,
      nextAction:
        equivalent !== undefined
          ? `Use ${equivalent} in ${selector}: ${choice}.`
          : `Drop ${parameter}, or switch to ${owners.join(" / ")} if that is what you meant.`,
    });
  }
  return warnings;
}

export async function dispatchComposite(
  selector: "action" | "mode",
  routes: Readonly<Record<string, CompositeRoute>>,
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
  const ignored = foreignParameterWarnings(
    selector,
    String(choice),
    routes,
    rest,
  );
  if (ignored.length === 0) {
    return {
      content,
      structuredContent: { [selector]: choice, ...payload },
    };
  }
  // The routed payload's own warnings list carries them, in its own shape;
  // a payload without one gets them in the text content only.
  const asRecords =
    route.name !== undefined && RECORD_WARNING_OPERATIONS.has(route.name);
  const routedWarnings = Array.isArray(payload.warnings)
    ? {
        warnings: [
          ...payload.warnings,
          ...ignored.map((warning) =>
            asRecords
              ? {
                  kind: "parameter_ignored",
                  message: warning.message,
                  nextAction: warning.nextAction,
                }
              : `${warning.message} ${warning.nextAction}`,
          ),
        ],
      }
    : {};
  return {
    content: [
      ...content,
      {
        type: "text",
        text: ignored
          .map((warning) => `${warning.message} ${warning.nextAction}`)
          .join("\n"),
      },
    ],
    structuredContent: { [selector]: choice, ...payload, ...routedWarnings },
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
