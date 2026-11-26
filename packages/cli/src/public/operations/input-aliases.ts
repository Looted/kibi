/**
 * Marks an input field that also accepts other names; the value lists them.
 * Agents that call a tool before its schema is in their prompt guess a
 * field's name (kb_search's `question` for `query`), and a refused call
 * costs a round trip in which some hosts print the whole input schema. The
 * marker is not advertised, so agents are still told the field's own name.
 */
export const INPUT_ALIASES = "x-kibi-input-aliases";

type SchemaNode = Readonly<Record<string, unknown>>;

function isNode(value: unknown): value is SchemaNode {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * `input` with each top-level field given under one of its declared other
 * names moved to the field's own name. A field already given under its own
 * name, or under more than one name, is left as it is, so validation still
 * refuses the other names as unknown fields.
 */
export function withInputAliases(
  input: Record<string, unknown>,
  schema: object,
): Record<string, unknown> {
  const properties = (schema as SchemaNode).properties;
  if (!isNode(properties)) return input;
  let renamed: Record<string, unknown> | undefined;
  for (const [field, fieldSchema] of Object.entries(properties)) {
    const aliases = isNode(fieldSchema) ? fieldSchema[INPUT_ALIASES] : [];
    if (!Array.isArray(aliases) || Object.hasOwn(input, field)) continue;
    const given = aliases.filter(
      (alias): alias is string =>
        typeof alias === "string" && Object.hasOwn(input, alias),
    );
    if (given.length !== 1) continue;
    const [alias] = given as [string];
    renamed ??= { ...input };
    renamed[field] = renamed[alias];
    delete renamed[alias];
  }
  return renamed ?? input;
}
