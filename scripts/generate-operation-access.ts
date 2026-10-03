import { writeFileSync } from "node:fs";
import path from "node:path";
import { listSpecs } from "../packages/cli/src/public/operations/catalog.js";

const mutability = (effects: readonly string[]): string =>
  effects.includes("kb-write") || effects.includes("workspace-write")
    ? "write"
    : "read";
const inputMode = (name: string): string =>
  [
    "kb_query",
    "kb_search",
    "kb_status",
    "kb_find_gaps",
    "kb_coverage",
    "kb_graph",
    "kb_check",
  ].includes(name)
    ? "--input JSON or flags"
    : "--input JSON";

/**
 * Catalog operations that the MCP server reaches through a consolidated tool
 * instead of registering them under their own name. Everything else is
 * registered by its catalog name, except the opt-in tools below.
 */
const MCP_CALL: Readonly<Record<string, string>> = {
  kb_skills_list: '`kb_skills` with `action: "list"`',
  kb_skills_load: '`kb_skills` with `action: "load"`',
  kb_skills_read: '`kb_skills` with `action: "read"`',
  kb_semantic_advisor: '`kb_model` with `mode: "analyze"`',
  kb_model_requirement: '`kb_model` with `mode: "requirement"`',
  kb_suggest_predicates: '`kb_model` with `mode: "predicates"`',
  kb_validate_upsert: "`kb_upsert` with `dryRun: true`",
  kb_sparql_remote:
    "`kb_sparql_remote`, registered only when `KIBI_MCP_OPTIONAL_TOOLS` names it",
};

const mappingRows = listSpecs()
  .filter((spec) => MCP_CALL[spec.name] !== undefined)
  .map(
    (spec) =>
      `- \`${spec.name}\`: MCP ${MCP_CALL[spec.name]}; CLI \`kibi ${spec.cliName}\` (\`${spec.cliName.replaceAll(" ", "-")}\`)`,
  );

const rows = listSpecs().map((spec) => {
  const resultVersion = spec.resultVersion ?? `kibi.${spec.name}.v1`;
  const effects = spec.effects.join(", ");
  const declarations = spec.declaredEffects ?? [];
  return `| \`${spec.name}\` | \`${spec.cliName.replaceAll(" ", "-")}\` | ${inputMode(spec.name)} | ${mutability(spec.effects)} | ${spec.requiresProlog ? "yes" : "no"} | ${effects} | peer; capability-selected | ${resultVersion} | ${declarations.some((effect) => effect.destructive) ? "yes" : "no"} | ${declarations.every((effect) => effect.retrySafety === "safe") ? "safe" : "unsafe"} | ${declarations.some((effect) => effect.openWorld) ? "yes" : "no"} | ${spec.outputSchema ? "yes" : "no"} |`;
});

const body = `# Kibi Operation Access Catalog

Generated from the public \`OperationSpec\` catalog. CLI JSON and MCP structured
content use the same \`KibiResult\` envelope (protocol 1); result data is versioned
per operation. Effects are authoritative for mutability and adapter annotations.

| Operation | CLI route | Input mode | Mutability | Requires Prolog | Effects | Interface | Result version | Destructive | Retry safety | Open-world | Output schema |
|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}

## MCP tools versus catalog operations

The MCP server registers 16 tools. Most carry their catalog operation name; the
operations below are reached through a consolidated MCP call instead, while the
CLI keeps their dedicated routes. Result payloads (for example
\`recommended_tools\`, \`suggested_next_tool\`, or repair-plan steps) still name
catalog operations, so translate them with this list.

${mappingRows.join("\n")}

The consolidated tools also have their own CLI routes: \`kibi skill\` for
\`kb_skills\` and \`kibi model\` for \`kb_model\`. \`kb_job_status\` is likewise
opt-in through \`KIBI_MCP_OPTIONAL_TOOLS\`; without it, \`kb_check\` with
\`async: true\` runs synchronously.

## JSON execution recipe

Use a trusted project-local, non-installing runner. Stdin contains one UTF-8 JSON
object and stdout contains the versioned result envelope:

\`\`\`bash
printf '%s\\n' '{"query":"authentication","limit":10}' | npx --no-install kibi search --input -
\`\`\`

\`_diagnostic_telemetry\` is adapter metadata, not business input. Never copy it
into entity properties. On \`committed_with_repairs\`, follow typed required
\`nextActions\` and do not retry the original mutation.

\`workspaceRoot\` is an MCP-only routing argument naming the directory a call is
about (see the kibi-usage skill). The CLI JSON routes do not accept it; they
always run in the current directory.
`;

for (const target of [
  "packages/runtime/src/skills/kibi-usage/resources/operation-access.md",
  "packages/cli/src/public/skills/kibi-usage/resources/operation-access.md",
]) {
  writeFileSync(path.resolve(process.cwd(), target), body);
}
