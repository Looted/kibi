import {
  ADVERTISED_DESCRIPTION,
  ADVERTISED_FIELDS,
} from "./advertised-schema.js";
import type { OperationSpec } from "./types.js";

/**
 * The kibi-usage resource `operation-fields.md`: the full description of
 * every operation input field the MCP server advertises in short. The MCP
 * tool list carries the short form so every session stays small; an agent
 * that needs a field's whole rule loads this resource with kb_skills.
 */

type Node = Readonly<Record<string, unknown>>;

const isNode = (value: unknown): value is Node =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * `[field path, full description]` of each node the MCP server advertises in
 * short: a node with a short description, and a field left out of an object
 * that advertises only some of its fields. First occurrence of each path
 * only.
 */
export function shortenedFields(schema: unknown): [string, string][] {
  const found = new Map<string, string>();
  const walk = (value: unknown, at: string): void => {
    if (Array.isArray(value)) {
      for (const child of value) walk(child, at);
      return;
    }
    if (!isNode(value)) return;
    if (
      typeof value[ADVERTISED_DESCRIPTION] === "string" &&
      typeof value.description === "string" &&
      !found.has(at)
    )
      found.set(at, value.description);
    const kept = value[ADVERTISED_FIELDS];
    for (const [key, child] of Object.entries(value)) {
      if (key === "properties" && isNode(child)) {
        for (const [name, field] of Object.entries(child)) {
          const fieldPath = at === "" ? name : `${at}.${name}`;
          if (
            Array.isArray(kept) &&
            !kept.includes(name) &&
            isNode(field) &&
            typeof field.description === "string" &&
            !found.has(fieldPath)
          )
            found.set(fieldPath, field.description);
          walk(field, fieldPath);
        }
      } else if (key === "items") {
        walk(child, `${at}[]`);
      } else {
        walk(child, at);
      }
    }
  };
  walk(schema, "");
  return [...found.entries()];
}

/** What the MCP server says about `workspaceRoot`, which every tool takes. */
const WORKSPACE_ROOT = [
  "## `workspaceRoot` (every MCP tool)",
  "",
  "- `workspaceRoot`: Optional absolute path of the workspace this call is about when it differs from the one the server started in, for example the git worktree you are working in. The server answers from that workspace's knowledge base when it is a worktree of the same repository or lies under the client's MCP roots; otherwise it answers from its own workspace and adds a workspace_mismatch diagnostic. Host hooks fill this in automatically where available.",
  "",
];

/** The resource text for `specs`, in catalog order. */
export function operationFieldReference(
  specs: readonly Pick<
    OperationSpec,
    "name" | "cliName" | "businessInputSchema"
  >[],
): string {
  const sections = specs.flatMap((spec) => {
    const fields = shortenedFields(spec.businessInputSchema);
    if (fields.length === 0) return [];
    return [
      `## \`${spec.name}\` (\`kibi ${spec.cliName}\`)`,
      "",
      ...fields.map(([field, text]) => `- \`${field}\`: ${text}`),
      "",
    ];
  });
  return [
    "# Kibi Operation Fields",
    "",
    "Generated from the public `OperationSpec` catalog by `scripts/generate-operation-fields.ts`. The MCP tool list advertises these input fields with a short description, or leaves them out (the specialist fields of a `kb_upsert` entity, which stay valid input); this is the full rule for each. Fields not listed are advertised in full.",
    "",
    ...WORKSPACE_ROOT,
    ...sections,
  ]
    .join("\n")
    .trimEnd()
    .concat("\n");
}
