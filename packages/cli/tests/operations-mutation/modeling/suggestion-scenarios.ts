import { BUILT_IN_PREDICATE_SCHEMAS } from "../../../src/operations/modeling/predicate-catalog.js";
import type { PredicateSchemaCandidate } from "../../../src/operations/modeling/predicate-types.js";

const base = {
  title: "t",
  description: "d",
  keywords: [],
  examples: [],
  tags: ["custom", "probe"],
};

/** Schemas that reach the branches no built-in schema exercises. */
export const CUSTOM_SCHEMAS = [
  {
    ...base,
    id: "C-PERM",
    predicate_name: "permission_rule",
    argument_names: ["actor", "action", "resource", "decision"],
    argument_types: ["actor", "action", "resource", "decision"],
  },
  {
    ...base,
    id: "C-SVC",
    predicate_name: "service_limit",
    argument_names: ["service", "limit"],
    argument_types: ["entity", "quantity"],
  },
  {
    ...base,
    id: "C-LEVEL",
    predicate_name: "risk_level",
    argument_names: ["subject", "level"],
    argument_types: ["entity", "level"],
    argument_constants: { level: ["low", "high"] },
    argument_aliases: { level: { lo: "low", hi: "high" } },
  },
  {
    ...base,
    id: "C-MID",
    predicate_name: "mid_rule",
    argument_names: ["kind", "subject", "value"],
    argument_types: ["kind", "entity", "value"],
  },
  {
    ...base,
    id: "C-NS",
    predicate_name: "ns_rule",
    predicate_namespace: "acme",
    argument_names: ["subject", "decision"],
    argument_types: ["entity", "decision"],
    argument_constants: { decision: ["allow", "deny"] },
  },
  {
    ...base,
    id: "C-LAUNCH",
    predicate_name: "launcher_command",
    argument_names: ["launcher", "command"],
    argument_types: ["entity", "command"],
  },
  {
    // A project schema reusing a built-in name with another arity.
    ...base,
    id: "C-STATE3",
    predicate_name: "state",
    argument_names: ["subject", "state", "extra"],
    argument_types: ["entity", "state", "note"],
  },
  {
    // A closed subject vocabulary: an undeclared subject is not reviewed.
    ...base,
    id: "C-CLOSEDSUBJ",
    predicate_name: "closed_subject",
    argument_names: ["subject", "value"],
    argument_types: ["entity", "value"],
    argument_constants: { subject: ["alpha"] },
  },
] as PredicateSchemaCandidate[];

export type SchemaRef = { builtin?: string; custom?: string };

export function resolveSchema(ref: SchemaRef): PredicateSchemaCandidate {
  const schema = ref.custom
    ? CUSTOM_SCHEMAS.find((candidate) => candidate.id === ref.custom)
    : BUILT_IN_PREDICATE_SCHEMAS.find(
        (candidate) => candidate.predicate_name === ref.builtin,
      );
  if (schema === undefined)
    throw new Error(`unknown schema ${JSON.stringify(ref)}`);
  return schema;
}

/** Argument bindings a scenario names by kind. */
export function bindingsFor(
  schema: PredicateSchemaCandidate,
  kind: string | undefined,
  subject: string,
): Record<string, string> {
  const names = schema.argument_names;
  const last = names.at(-1) as string;
  if (kind === "first") return { [names[0] as string]: " bound_value " };
  if (kind === "decision-deny")
    return names.includes("decision")
      ? { decision: "deny" }
      : { [last]: "deny" };
  if (kind === "decision-allow")
    return names.includes("decision")
      ? { decision: "allow" }
      : { [last]: "allow" };
  if (kind === "subject") return { subject: "billing" };
  if (kind === "first-is-subject") return { [names[0] as string]: subject };
  if (kind === "blank")
    return Object.fromEntries(names.map((name) => [name, "   "]));
  return {};
}
