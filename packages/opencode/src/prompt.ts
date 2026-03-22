import type { CommentAnalysisResult } from "./comment-analysis.js";
// implements REQ-opencode-kibi-plugin-v1, REQ-opencode-agent-mcp-only
import type { KibiConfig } from "./config.js";
import { isPluginEnabled } from "./config.js";
import type { PathKind } from "./path-kind.js";
import type { WorkspaceHealth } from "./workspace-health.js";

const SENTINEL = "<!-- kibi-opencode -->";

export interface PromptContext {
  recentEdits: Array<{ path: string; kind: PathKind }>;
  workspaceHealth?: WorkspaceHealth;
  hasRecentKbEdit?: boolean;
  recentCommentSuggestion?: CommentAnalysisResult | null;
}

/**
 * Build prompt guidance block based on path kind.
 */
// implements REQ-opencode-kibi-plugin-v1, REQ-opencode-agent-mcp-only
function buildContextualGuidance(context: PromptContext): string {
  const parts: string[] = [SENTINEL];

  if (context.hasRecentKbEdit) {
    parts.push(`
⚠️  **WARNING: Do not edit .kb/** files manually.**

The Kibi knowledge base is managed through public MCP tools and internal maintenance flows. Direct manual edits to files under .kb/** can cause inconsistencies and should be avoided.

Instead:
- Use kb_upsert to create/update entities
- Use kb_query to inspect the KB
- Use kb_check to validate consistency
`);
  }

  if (context.workspaceHealth?.needsBootstrap) {
    parts.push(`
🔧 **Bootstrap required**

This repository does not appear to have Kibi initialized. Agents should:
- Use \`/init-kibi\` for retroactive bootstrap of existing repos (preferred MCP command)
- Ask the user/operator to run setup or repair outside this session if \`/init-kibi\` is insufficient

Do not run \`kibi\` CLI commands directly; use the MCP tools (kb_query, kb_upsert, kb_delete, kb_check).
`);
  }

  const codeEdits = context.recentEdits.filter((e) => e.kind === "code");
  const reqEdits = context.recentEdits.filter((e) => e.kind === "requirement");
  const kbDocEdits = context.recentEdits.filter((e) =>
    ["requirement", "scenario", "test", "adr", "fact"].includes(e.kind),
  );

  if (codeEdits.length > 0) {
    const suggestion = context.recentCommentSuggestion;
    if (suggestion) {
      let routingMessage = "";
      switch (suggestion.suggestionType) {
        case "fact":
          routingMessage = `🎯 **Durable knowledge detected: FACT**

Your recent code edit contains a comment that looks like a **domain invariant** (properties, limits, defaults, or cardinality constraints).

**Action**: Instead of inline comments, route this to a FACT entity:
- Create \`documentation/facts/FACT-xxx.md\` with the invariant
- Link it to relevant requirements using \`constrains\` or \`requires_property\` relationships
- Reference the FACT in code with a comment (e.g., \`// constrained by FACT-xxx\` in JS/TS or a docstring comment in Python)

This keeps domain truths centralized and searchable.`;
          break;
        case "adr":
          routingMessage = `🎯 **Durable knowledge detected: ADR**

Your recent code edit contains a comment that looks like a **technical decision** (tradeoffs, rationale, or architecture choices).

**Action**: Instead of inline comments, route this to an ADR entity:
- Create \`documentation/adr/ADR-xxx.md\` documenting the decision
- Include context, options considered, and the chosen approach
- Link to constrained code symbols using \`constrained_by\` relationships

This preserves decision context for future maintainers.`;
          break;
        case "req":
          routingMessage = `🎯 **Durable knowledge detected: REQ**

Your recent code edit contains a comment that looks like **behavior intent** (system capabilities or user-facing requirements).

**Action**: Instead of inline comments, route this to a REQ entity:
- Create \`documentation/requirements/REQ-xxx.md\` with the behavior description
- Add SCEN and TEST entities for specification and verification
- Link code to requirements using traceability comments (e.g., \`// implements REQ-xxx\` in JS/TS or docstring references in Python)

This ensures behavior is documented and traceable.`;
          break;
        default:
          routingMessage = `📝 **Code changes detected**

Before implementing or explaining code:
1. **Query Kibi first** - Run kb_query by sourceFile to find related requirements, ADRs, tests, and symbols.
2. **Prefer Kibi over comments** - Store durable knowledge in KB entities instead of inline comments.
3. **Add traceability** - Add traceability comments to new or modified functions/classes so the pre-commit hook can verify coverage (e.g., \`// implements REQ-xxx\` in JS/TS or docstring references in Python).`;
      }
      parts.push(routingMessage);
    } else {
      parts.push(`
📝 **Code changes detected**

Before implementing or explaining code:
1. **Query Kibi first** - Run kb_query by sourceFile to find related requirements, ADRs, tests, and symbols.
2. **Prefer Kibi over comments** - Store durable knowledge in KB entities instead of inline comments.
3. **Add traceability** - Add traceability comments to new or modified functions/classes (e.g., \`// implements REQ-xxx\` in JS/TS or docstring references in Python) so the pre-commit hook can verify coverage.

If you're adding long explanatory comments, consider routing that knowledge to:
- \`FACT\` for domain invariants, properties, limits, cardinalities
- \`ADR\` for technical decisions, tradeoffs, rationale
- \`REQ\` for system behavior requirements
- \`SCEN\` for behavior examples and flows
- \`TEST\` for verification intent
`);
    }
  }

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

  if (kbDocEdits.length > 0 && reqEdits.length === 0) {
    parts.push(`
📚 **Kibi documentation changes detected**

When editing KB documentation:
1. **Maintain traceability** - Link entities using relationships: specified_by (req→scenario), verified_by (req→test), etc.
2. **Validate** - Use \`kb_check\` after making changes to catch integrity issues.
3. **Follow entity patterns** - Ensure each entity has proper frontmatter with required fields.
`);
  }

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

Do not invoke Kibi CLI commands directly from the agent.

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

Do not invoke Kibi CLI commands directly from the agent.

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
