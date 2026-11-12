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

/** An object to read fields from; a list's named fields are all missing. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Every key of a `properties` map anywhere in a schema. Lists are walked by
 * their positions; enum and const values are strings, so they add nothing.
 */
function collectFieldNames(schema: unknown, names: Set<string>): void {
  if (!isRecord(schema)) return;
  for (const [key, value] of Object.entries(schema)) {
    if (key === "properties") {
      for (const name of Object.keys(value as object)) names.add(name);
    }
    collectFieldNames(value, names);
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

const SCHEMA_FIELD_NAMES: ReadonlySet<string> = (() => {
  const names = new Set<string>(UPSERT_INPUT_FIELDS);
  collectFieldNames(entitySchema, names);
  collectFieldNames(relationshipSchema, names);
  return names;
})();

// implements REQ-kibi-telemetry-agent-signals
/** Every field name the entity and relationship schemas define. */
export function kibiSchemaFieldNames(): ReadonlySet<string> {
  return SCHEMA_FIELD_NAMES;
}

// implements REQ-kibi-telemetry-agent-signals
/**
 * A JSON pointer as a schema field path: list positions become `*`, and a
 * segment that is not a Kibi schema field name turns the whole path into
 * `other`, so a key an agent invented never leaves the machine.
 */
export function schemaFieldPath(segments: readonly string[]): string {
  const mapped = segments.map((segment) =>
    /^\d+$/.test(segment)
      ? "*"
      : SCHEMA_FIELD_NAMES.has(segment)
        ? segment
        : null,
  );
  if (mapped.some((segment) => segment === null)) return "other";
  return mapped.join(".");
}

/**
 * A JSON pointer's segments. Escapes (`~0`, `~1`) are left as they are: no
 * Kibi field name contains `~` or `/`, so an escaped key maps to `other`.
 */
function pointerSegments(pointer: string): string[] {
  return pointer.split("/").slice(1);
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
    const named = [params.missingProperty, params.additionalProperty].find(
      (value): value is string => typeof value === "string",
    );
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

/** The result payload: `data` of a CLI envelope, `structuredContent` of MCP. */
function dataOf(result: unknown): Record<string, unknown> | undefined {
  const data = isRecord(result)
    ? (result.data ?? result.structuredContent)
    : undefined;
  return isRecord(data) ? data : undefined;
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

/**
 * The fixed category an engine client attached to an ENGINE_START_FAILED
 * error (engineStartFailureKind), found through wrapping causes.
 */
function engineStartFailure(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 5 && isRecord(current); depth += 1) {
    if (
      current.code === "ENGINE_START_FAILED" &&
      typeof current.startFailure === "string"
    ) {
      return current.startFailure;
    }
    current = current.cause;
  }
  return undefined;
}

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
  } = { error: input.error };
  if (issues.length > 0) signals.issues = issues;
  if (UPSERT_OPERATIONS.has(input.operation)) {
    signals.dryRun =
      input.operation === "kb_validate_upsert" || args.dryRun === true;
    if (Array.isArray(args.relationships)) {
      signals.relationshipCount = args.relationships.length;
    }
    if (typeof args.type === "string" && typeof args.id === "string") {
      signals.retryKey = `${args.type}\0${args.id}`;
    }
    const code =
      rejectionOf(data)?.code ??
      (data?.valid === false ? data.errorCode : undefined);
    if (typeof code === "string") signals.rejectionCode = code;
  }
  const startFailure = engineStartFailure(input.error);
  if (startFailure !== undefined) signals.rejectionCode = startFailure;
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
