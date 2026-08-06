import { parseEntityFromList, parseListOfLists } from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import {
  DEFAULT_USAGE_HINTS,
  USAGE_HINTS_BY_PREDICATE,
} from "./predicate-catalog.js";
import type {
  PredicateSchemaCandidate,
  PredicateUsageHints,
} from "./predicate-types.js";
import { hashId, normalizeOptionalString } from "./predicate-utils.js";

// implements REQ-mcp-suggest-predicates
export function schemaForCandidate(schema: PredicateSchemaCandidate): Omit<
  PredicateSchemaCandidate,
  "keywords"
> & {
  usage_hints: PredicateUsageHints;
} {
  return {
    id: schema.id,
    predicate_name: schema.predicate_name,
    title: schema.title,
    description: schema.description,
    argument_names: schema.argument_names,
    argument_types: schema.argument_types,
    examples: schema.examples,
    tags: schema.tags,
    usage_hints:
      schema.usage_hints ??
      USAGE_HINTS_BY_PREDICATE[schema.predicate_name] ??
      DEFAULT_USAGE_HINTS,
  };
}

// implements REQ-mcp-suggest-predicates
export async function loadExistingPredicateSchemas(
  prolog: PrologPort | null,
  includeExistingSchemas: boolean,
  warnings: string[],
): Promise<PredicateSchemaCandidate[]> {
  if (!includeExistingSchemas || prolog === null) {
    return [];
  }

  try {
    const queryResult = await prolog.query(
      "findall([Id,'fact',Props], (kb_entity(Id, 'fact', Props), member(fact_kind=predicate_schema, Props)), Results)",
    );
    if (!queryResult.success) {
      throw new Error(queryResult.error || "Query failed with unknown error");
    }

    const facts = queryResult.bindings.Results
      ? parseListOfLists(queryResult.bindings.Results).map(parseEntityFromList)
      : [];
    return facts.flatMap((fact) => predicateSchemaFromEntity(fact));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(
      `Existing predicate_schema facts could not be loaded: ${message}`,
    );
    return [];
  }
}

// implements REQ-mcp-suggest-predicates
export function predicateSchemaFromEntity(
  entity: Record<string, unknown>,
): PredicateSchemaCandidate[] {
  if (entity.fact_kind !== "predicate_schema") return [];
  const predicateName = normalizeOptionalString(
    typeof entity.predicate_name === "string"
      ? entity.predicate_name
      : undefined,
  );
  if (!predicateName) return [];
  const usageHints = usageHintsFromEntity(entity);

  return [
    {
      id: String(entity.id ?? hashId("FACT-SCHEMA", [predicateName])),
      predicate_name: predicateName,
      title: String(entity.title ?? predicateName),
      description: String(
        entity.description ??
          `Project-local ${predicateName} predicate schema.`,
      ),
      argument_names: stringArray(entity.argument_names),
      argument_types: stringArray(entity.argument_types),
      keywords: [
        predicateName,
        ...stringArray(entity.aliases),
        ...stringArray(entity.tags),
      ],
      examples: stringArray(entity.examples),
      tags: stringArray(entity.tags),
      ...(usageHints ? { usage_hints: usageHints } : {}),
    },
  ];
}

// implements REQ-mcp-suggest-predicates
export function usageHintsFromEntity(
  entity: Record<string, unknown>,
): PredicateUsageHints | undefined {
  const useWhen = stringArray(entity.use_when);
  const doNotUseWhen = stringArray(entity.do_not_use_when);
  if (useWhen.length === 0 || doNotUseWhen.length === 0) {
    return undefined;
  }
  return { use_when: useWhen, do_not_use_when: doNotUseWhen };
}

// implements REQ-mcp-suggest-predicates
export function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const normalized = normalizeOptionalString(
      typeof item === "string" ? item : undefined,
    );
    return normalized ? [normalized] : [];
  });
}
