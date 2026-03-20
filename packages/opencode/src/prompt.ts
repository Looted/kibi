// implements REQ-opencode-kibi-plugin-v1
import type { KibiConfig } from "./config.js";
import { isPluginEnabled } from "./config.js";
import type { PathKind } from "./path-kind.js";
import type { WorkspaceHealth } from "./workspace-health.js";

const SENTINEL = "<!-- kibi-opencode -->";

export interface PromptContext {
  recentEdits: Array<{ path: string; kind: PathKind }>;
  workspaceHealth?: WorkspaceHealth;
  hasRecentKbEdit?: boolean;
}

/**
 * Build prompt guidance block based on path kind.
 */
// implements REQ-opencode-kibi-plugin-v1
function buildContextualGuidance(context: PromptContext): string {
  const parts: string[] = [SENTINEL];

  // 1. Check for recent .kb edits (loud warning)
  if (context.hasRecentKbEdit) {
    parts.push(`
⚠️  **WARNING: Do not edit .kb/** files manually.**

The Kibi knowledge base is managed through MCP and CLI tools. Direct manual edits to files under .kb/** can cause inconsistencies and should be avoided.

Instead:
- Use kb_upsert to create/update entities
- Use kb_query to inspect the KB
- Use kb_check to validate consistency
`);
  }

  // 2. Check for bootstrap/health issues
  if (context.workspaceHealth?.needsBootstrap) {
    parts.push(`
🔧 **Bootstrap required**

This repository does not appear to have Kibi initialized. Consider running:
- \`/init-kibi\` for retroactive bootstrap of existing repos
- \`kibi init\` for new repos
- \`kibi doctor\` to verify your environment
`);
  }

  // 3. Analyze recent edits and provide targeted guidance
  const codeEdits = context.recentEdits.filter((e) => e.kind === "code");
  const reqEdits = context.recentEdits.filter((e) => e.kind === "requirement");
  const kbDocEdits = context.recentEdits.filter((e) =>
    ["requirement", "scenario", "test", "adr", "fact"].includes(e.kind),
  );

  // Code edit guidance
  if (codeEdits.length > 0) {
    parts.push(`
📝 **Code changes detected**

Before implementing or explaining code:
1. **Query Kibi first** - Run kb_query by sourceFile to find related requirements, ADRs, tests, and symbols.
2. **Prefer Kibi over comments** - Store durable knowledge in KB entities instead of inline comments.
3. **Add traceability** - Add \`// implements REQ-xxx\` to every new or modified function/class so the pre-commit hook can verify coverage.

If you're adding long explanatory comments, consider routing that knowledge to:
- \`FACT\` for domain invariants, properties, limits, cardinalities
- \`ADR\` for technical decisions, tradeoffs, rationale
- \`REQ\` for system behavior requirements
- \`SCEN\` for behavior examples and flows
- \`TEST\` for verification intent
`);
  }

  // Requirement edit guidance
  if (reqEdits.length > 0) {
    parts.push(`
📋 **Requirement changes detected**

When editing requirements:
1. **Keep artifacts separate** - Do not embed scenarios or tests inside requirement files.
2. **Add verification** - Create or update linked \`SCEN\` and \`TEST\` entities.
3. **Check coverage** - For \`priority: must\` requirements, ensure both scenario and test coverage.

Preferred structure:
- \`REQ-xxx.md\` contains the requirement statement
- \`SCEN-xxx.md\` specifies behavior via Given/When/Then
- \`TEST-xxx.md\` verifies the requirement
`);
  }

  // KB doc edit guidance (requirement, scenario, test, ADR, fact)
  if (kbDocEdits.length > 0 && reqEdits.length === 0) {
    parts.push(`
📚 **Kibi documentation changes detected**

When editing KB documentation:
1. **Maintain traceability** - Link entities using relationships: specified_by (req→scenario), verified_by (req→test), etc.
2. **Validate** - Run \`kibi check\` after making changes to catch integrity issues.
3. **Follow entity patterns** - Ensure each entity has proper frontmatter with required fields.
`);
  }

  // Only include general Kibi workflow if no specific context (beyond the sentinel)
  if (parts.length === 1) {
    parts.push(`This project uses Kibi (via MCP). Prefer storing durable knowledge in Kibi over code comments.

Before changing behavior: query Kibi by sourceFile, id, type, or tags; do not rely on undocumented tools.

Keep changed symbols traceable: add \`// implements REQ-xxx\` to every new or modified function/class so the pre-commit hook can verify coverage.

Run kb_check after KB mutations.

Dogfood note for this repo: OpenCode here uses local built \`kibi-mcp\` and \`kibi-opencode\` artifacts. If you change package versions or local package wiring, run \`bun run build\` before relying on OpenCode in this workspace.

**Kibi-first workflow:**
1. **Discover**: Run kb_query with filters (sourceFile, type, tags) to find related requirements, ADRs, tests, and symbols.
2. **Document intent**: If you are about to explain code, STOP. Route that explanation to kb_upsert instead of inline comments.
3. **Link during work**: When creating KB entities, include relationship rows: specified_by (req→scenario), verified_by (req→test), implements (symbol→req), covered_by (symbol→test).
4. **Validate**: Run kb_check after KB mutations to catch violations early.

**Public Kibi tools only:** kb_query, kb_upsert, kb_delete, kb_check.

Bootstrap existing repos: use \`/init-kibi\` to run the retroactive initialization workflow.`);
  }

  return parts.join("\n\n").trim();
}

/**
 * Build the static guidance block (original behavior).
 */
const BASE_GUIDANCE = `${SENTINEL}
This project uses Kibi (via MCP). Prefer storing durable knowledge in Kibi over code comments.

Before changing behavior: query Kibi by sourceFile, id, type, or tags; do not rely on undocumented tools.

Keep changed symbols traceable: add \`// implements REQ-xxx\` to every new or modified function/class so the pre-commit hook can verify coverage.

Run kb_check after KB mutations.

Dogfood note for this repo: OpenCode here uses local built \`kibi-mcp\` and \`kibi-opencode\` artifacts. If you change package versions or local package wiring, run \`bun run build\` before relying on OpenCode in this workspace.

**Kibi-first workflow:**
1. **Discover**: Run kb_query with filters (sourceFile, type, tags) to find related requirements, ADRs, tests, and symbols.
2. **Document intent**: If you are about to explain code, STOP. Route that explanation to kb_upsert instead of inline comments.
3. **Link during work**: When creating KB entities, include relationship rows: specified_by (req→scenario), verified_by (req→test), implements (symbol→req), covered_by (symbol→test).
4. **Validate**: Run kb_check after KB mutations to catch violations early.

**Public Kibi tools only:** kb_query, kb_upsert, kb_delete, kb_check.

Bootstrap existing repos: use \`/init-kibi\` to run the retroactive initialization workflow.`;

/**
 * Build prompt with contextual guidance based on recent edits and workspace state.
 */
export function buildPrompt(context?: PromptContext): string {
  if (!context) {
    return BASE_GUIDANCE.trim();
  }
  return buildContextualGuidance(context).trim();
}

/**
 * Inject prompt guidance if not already present.
 */
export function injectPrompt(
  current: string,
  config: KibiConfig,
  context?: PromptContext,
): string {
  if (!config.prompt.enabled || !isPluginEnabled(config)) {
    return current;
  }
  if (current.includes(SENTINEL)) {
    return current;
  }
  return `${current}\n\n${buildPrompt(context)}`;
}

export { SENTINEL };
