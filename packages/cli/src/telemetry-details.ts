// implements REQ-kibi-telemetry-agent-signals
import type { ErrorObject } from "ajv";
import type {
  OperationSignals,
  RejectionIssue,
} from "kibi-agent-core/usage-telemetry";

import { KbRejection } from "./cli-errors.js";
import entitySchema from "./public/schemas/entity.js";
import relationshipSchema from "./public/schemas/relationship.js";

/**
 * What a Kibi operation tells anonymous telemetry about where an agent
 * struggled, shared by the CLI and the MCP server so both report the same
 * fields. Only fixed vocabulary leaves this module: JSON Schema keywords,
 * Kibi check names, Kibi schema field names, counts and booleans. A field
 * name an agent invented is reported as `other`, and no value is read.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectFieldNames(schema: unknown, names: Set<string>): void {
  if (Array.isArray(schema)) {
    for (const item of schema) collectFieldNames(item, names);
    return;
  }
  if (!isRecord(schema)) return;
  for (const [key, value] of Object.entries(schema)) {
    if (key === "properties" && isRecord(value)) {
      for (const name of Object.keys(value)) names.add(name);
    }
    if (key !== "enum" && key !== "const" && key !== "examples") {
      collectFieldNames(value, names);
    }
  }
}

/** The top-level fields of an upsert call, besides the entity's own. */
const UPSERT_INPUT_FIELDS = [
  "type",
  "id",
  "properties",
  "relationships",
  "document",
  "dryRun",
  "plannedFacts",
] as const;

let schemaFieldNames: ReadonlySet<string> | undefined;

// implements REQ-kibi-telemetry-agent-signals
/** Every field name the entity and relationship schemas define. */
export function kibiSchemaFieldNames(): ReadonlySet<string> {
  if (schemaFieldNames === undefined) {
    const names = new Set<string>(UPSERT_INPUT_FIELDS);
    collectFieldNames(entitySchema, names);
    collectFieldNames(relationshipSchema, names);
    schemaFieldNames = names;
  }
  return schemaFieldNames;
}

// implements REQ-kibi-telemetry-agent-signals
/**
 * A JSON pointer as a schema field path: list positions become `*`, and a
 * segment that is not a Kibi schema field name turns the whole path into
 * `other`, so a key an agent invented never leaves the machine.
 */
export function schemaFieldPath(segments: readonly string[]): string {
  const known = kibiSchemaFieldNames();
  const mapped = segments
    .filter((segment) => segment !== "")
    .map((segment) =>
      /^\d+$/.test(segment) ? "*" : known.has(segment) ? segment : null,
    );
  if (mapped.some((segment) => segment === null)) return "other";
  return mapped.join(".");
}

function pointerSegments(pointer: string): string[] {
  return pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
}

// implements REQ-kibi-telemetry-agent-signals
/**
 * Ajv errors as rejection issues: the keyword as the rule and the field the
 * error is about (the missing or extra property for `required` and
 * `additionalProperties`), under `prefix` segments such as `relationships.*`.
 */
export function schemaIssues(
  errors: readonly ErrorObject[] | null | undefined,
  prefix: readonly string[] = [],
): RejectionIssue[] {
  return (errors ?? []).map((error) => {
    const params = error.params as Record<string, unknown>;
    const named =
      typeof params.missingProperty === "string"
        ? params.missingProperty
        : typeof params.additionalProperty === "string"
          ? params.additionalProperty
          : undefined;
    const segments = [
      ...prefix,
      ...pointerSegments(error.instancePath),
      ...(named === undefined ? [] : [named]),
    ];
    const field = schemaFieldPath(segments);
    return {
      rule: error.keyword,
      ...(field === "" ? {} : { field }),
    };
  });
}

/** A rejection issue as a Kibi check name, with no field. */
export function checkIssue(rule: string, field?: string): RejectionIssue {
  return field === undefined ? { rule } : { rule, field };
}

function dataOf(result: unknown): Record<string, unknown> | undefined {
  if (!isRecord(result)) return undefined;
  if (isRecord(result.data)) return result.data;
  if (isRecord(result.structuredContent)) return result.structuredContent;
  return undefined;
}

function rejectionOf(
  data: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  return data !== undefined && isRecord(data.rejection)
    ? data.rejection
    : undefined;
}

function issuesOf(value: unknown): RejectionIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    isRecord(item) && typeof item.rule === "string"
      ? [
          {
            rule: item.rule,
            ...(typeof item.field === "string" ? { field: item.field } : {}),
          },
        ]
      : [],
  );
}

const UPSERT_OPERATIONS = new Set(["kb_upsert", "kb_validate_upsert"]);

// implements REQ-kibi-telemetry-agent-signals
/**
 * The struggle signals of one operation call, from its input, its result
 * envelope and the error it threw. agent-core sanitizes and buckets them.
 */
export function operationTelemetrySignals(input: {
  readonly operation: string;
  readonly args?: unknown;
  readonly result?: unknown;
  readonly error?: unknown;
  /** Issues found before the operation ran (invalid input). */
  readonly inputIssues?: readonly RejectionIssue[];
}): OperationSignals {
  const args = isRecord(input.args) ? input.args : {};
  const data = dataOf(input.result);
  const issues = [
    ...(input.inputIssues ?? []),
    ...(input.error instanceof KbRejection ? input.error.issues : []),
    ...issuesOf(rejectionOf(data)?.issues),
  ];
  const signals: {
    -readonly [Key in keyof OperationSignals]: OperationSignals[Key];
  } = {};
  if (issues.length > 0) signals.issues = issues;
  if (input.error !== undefined) signals.error = input.error;
  if (UPSERT_OPERATIONS.has(input.operation)) {
    signals.dryRun =
      input.operation === "kb_validate_upsert" || args.dryRun === true;
    if (Array.isArray(args.relationships)) {
      signals.relationshipCount = args.relationships.length;
    }
    if (typeof args.type === "string" && typeof args.id === "string") {
      signals.retryKey = `${args.type}\0${args.id}`;
    }
    const rejection = rejectionOf(data);
    if (typeof rejection?.code === "string") {
      signals.rejectionCode = rejection.code;
    } else if (data?.valid === false && typeof data.errorCode === "string") {
      signals.rejectionCode = data.errorCode;
    }
  }
  if (input.operation === "kb_search" && data !== undefined) {
    signals.search = true;
    if (typeof data.count === "number") {
      signals.resultCount = data.count;
      signals.abstained = data.count === 0;
    }
    const analysis = isRecord(data.queryAnalysis) ? data.queryAnalysis : {};
    const hints = isRecord(analysis.hints) ? analysis.hints : undefined;
    signals.hintsShown =
      Array.isArray(hints?.items) && (hints.items as unknown[]).length > 0;
  }
  return signals;
}
