/**
 * Operation input schemas carry every field's full JSON Schema, which the
 * CLI JSON route and the MCP server validate input against. Some fields hold
 * large nested contracts that agents rarely author by hand (proof contracts
 * and receipts). Advertising them in full costs every MCP session the same
 * tens of thousands of tokens, so such a field is marked with
 * {@link ADVERTISED_SUMMARY} and advertised as a one-line stub instead. The
 * full contract still validates the input, and a rejection under a marked
 * field returns that field's full schema.
 */

/** Marks a schema node advertised as a stub; the value is its one-line summary. */
export const ADVERTISED_SUMMARY = "x-kibi-advertised-summary";

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

/** `schema` with every marked node replaced by its stub. */
export function advertisedInputSchema<T>(schema: T): T {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (!isNode(value)) return value;
    const summary = value[ADVERTISED_SUMMARY];
    if (typeof summary === "string") return stub(value, summary);
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, walk(child)]),
    );
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
