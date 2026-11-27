/**
 * Operation input schemas carry every field's full JSON Schema, which the
 * CLI JSON route and the MCP server validate input against. Every MCP session
 * pays for the advertised schemas, so three things are trimmed there:
 *
 * - A field holding a large nested contract that agents rarely author by
 *   hand (proof contracts and receipts) is marked with
 *   {@link ADVERTISED_SUMMARY} and advertised as a one-line stub. A rejection
 *   under a marked field returns that field's full schema.
 * - A field whose description runs long is marked with
 *   {@link ADVERTISED_DESCRIPTION} and advertised with that short description;
 *   the full one stays in the catalog and in the generated kibi-usage
 *   resource `operation-fields`, which kb_skills reads.
 * - A choice among string constants (`anyOf` of `{type, const}`) is
 *   advertised as the equivalent `enum`.
 * - A string choice too long to be worth its characters (kb_check's rule
 *   names) is marked with {@link ADVERTISED_OPEN} and advertised as a plain
 *   string; the full schema still refuses a value outside the choice and
 *   names the allowed values.
 * - An object whose fields are mostly specialist ones (fact, proof and
 *   predicate fields of an entity) is marked with {@link ADVERTISED_FIELDS}
 *   and advertised with only the fields it names. The others stay valid
 *   input and are listed in full in `operation-fields`.
 *
 * - A field's other accepted names ({@link INPUT_ALIASES}) are not
 *   advertised, so agents are told only the field's own name.
 *
 * The full schema still validates the input.
 */

/** Marks a schema node advertised as a stub; the value is its one-line summary. */
export const ADVERTISED_SUMMARY = "x-kibi-advertised-summary";

/**
 * Marks a schema node whose description is advertised in short; the value is
 * that short description, at most {@link ADVERTISED_DESCRIPTION_LIMIT}
 * characters.
 */
export const ADVERTISED_DESCRIPTION = "x-kibi-advertised-description";

/**
 * Marks an object schema node advertised with only some of its
 * `properties`; the value lists the field names to keep.
 */
export const ADVERTISED_FIELDS = "x-kibi-advertised-fields";

/** Marks a string schema node advertised without its `enum`. */
export const ADVERTISED_OPEN = "x-kibi-advertised-open";

/** The longest description the MCP server advertises for an input field. */
export const ADVERTISED_DESCRIPTION_LIMIT = 120;

import { INPUT_ALIASES } from "./input-aliases.js";

type SchemaNode = Readonly<Record<string, unknown>>;

function isNode(value: unknown): value is SchemaNode {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * The stub advertised for a marked node: its type and summary only, loose
 * enough that every value the full schema accepts also passes the stub.
 */
function stub(node: SchemaNode, summary: string): SchemaNode {
  return node.type === "array"
    ? { type: "array", items: { type: "object" }, description: summary }
    : { type: "object", description: summary };
}

/** The constants of an `anyOf` whose every branch is a string constant. */
function stringConstants(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const constants: string[] = [];
  for (const branch of value) {
    if (
      !isNode(branch) ||
      Object.keys(branch).length !== 2 ||
      branch.type !== "string" ||
      typeof branch.const !== "string"
    )
      return undefined;
    constants.push(branch.const);
  }
  return constants;
}

/**
 * `schema` as the MCP server advertises it: every stub-marked node replaced
 * by its stub, every short description in place of its full one, and every
 * choice among string constants as an `enum`.
 */
export function advertisedInputSchema<T>(schema: T): T {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (!isNode(value)) return value;
    const summary = value[ADVERTISED_SUMMARY];
    if (typeof summary === "string") return stub(value, summary);
    const kept = value[ADVERTISED_FIELDS];
    const entries: [string, unknown][] = [];
    for (const [key, child] of Object.entries(value)) {
      if (key === ADVERTISED_DESCRIPTION || key === ADVERTISED_FIELDS) continue;
      if (key === ADVERTISED_OPEN || key === INPUT_ALIASES) continue;
      if (key === "enum" && value[ADVERTISED_OPEN] === true) continue;
      if (key === "properties" && Array.isArray(kept) && isNode(child)) {
        entries.push([
          key,
          Object.fromEntries(
            Object.entries(child)
              .filter(([name]) => kept.includes(name))
              .map(([name, field]) => [name, walk(field)]),
          ),
        ]);
        continue;
      }
      const constants = key === "anyOf" ? stringConstants(child) : undefined;
      if (constants !== undefined) {
        entries.push(["type", "string"], ["enum", constants]);
      } else if (
        key === "description" &&
        typeof value[ADVERTISED_DESCRIPTION] === "string"
      ) {
        entries.push([key, value[ADVERTISED_DESCRIPTION]]);
      } else {
        entries.push([key, walk(child)]);
      }
    }
    return Object.fromEntries(entries);
  };
  return walk(schema) as T;
}

/** The node an input path (`/properties/proof_contract/…`) first reaches that is marked, if any. */
function markedNodeOn(
  schema: SchemaNode,
  instancePath: string,
): { path: string; node: SchemaNode } | undefined {
  let node: SchemaNode = schema;
  const walked: string[] = [];
  for (const raw of instancePath.split("/").slice(1)) {
    const segment = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    const properties = node.properties;
    const next = isNode(properties)
      ? properties[segment]
      : /^\d+$/.test(segment)
        ? node.items
        : undefined;
    if (!isNode(next)) return undefined;
    node = next;
    walked.push(raw);
    if (typeof node[ADVERTISED_SUMMARY] === "string") {
      return { path: `/${walked.join("/")}`, node };
    }
  }
  return undefined;
}

/**
 * For input rejected under a field advertised as a stub, one line per such
 * field giving its full schema, so the caller can correct the payload
 * without a separate lookup.
 */
export function advertisedFieldSchemaHints(
  schema: object,
  instancePaths: readonly string[],
): string[] {
  const hints = new Map<string, string>();
  for (const instancePath of instancePaths) {
    const marked = markedNodeOn(schema as SchemaNode, instancePath);
    if (marked === undefined || hints.has(marked.path)) continue;
    const { [ADVERTISED_SUMMARY]: _summary, ...full } = marked.node;
    hints.set(
      marked.path,
      `${marked.path} full schema: ${JSON.stringify(full)}`,
    );
  }
  return [...hints.values()];
}
