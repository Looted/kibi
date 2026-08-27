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

| MCP tool name | CLI route | Input mode | Mutability | Requires Prolog | Effects | Interface | Result version | Destructive | Retry safety | Open-world | Output schema |
|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.join("\n")}

## JSON execution recipe

Use a trusted project-local, non-installing runner. Stdin contains one UTF-8 JSON
object and stdout contains the versioned result envelope:

\`\`\`bash
printf '%s\\n' '{"query":"authentication","limit":10}' | npx --no-install kibi search --input -
\`\`\`

\`_diagnostic_telemetry\` is adapter metadata, not business input. Never copy it
into entity properties. On \`committed_with_repairs\`, follow typed required
\`nextActions\` and do not retry the original mutation.
`;

writeFileSync(
  path.resolve(
    process.cwd(),
    "packages/runtime/src/skills/kibi-usage/resources/operation-access.md",
  ),
  body,
);
