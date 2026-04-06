import * as path from "node:path";
import type { CommentAnalysisResult } from "./comment-analysis.js";
// implements REQ-opencode-smart-enforcement-v1, REQ-opencode-kibi-plugin-v1, REQ-opencode-agent-mcp-only
import type { KibiConfig } from "./config.js";
import { isPluginEnabled } from "./config.js";
import type { CacheKey, GuidanceCache } from "./guidance-cache.js";
import type { PathKind } from "./path-kind.js";
import type { RepoPosture } from "./repo-posture.js";
import type { RiskClass } from "./risk-classifier.js";
import { getSourceLinkedRequirementIds } from "./source-linked-guidance.js";
import type { WorkspaceHealth } from "./workspace-health.js";

const SENTINEL = "<!-- kibi-opencode -->";

// ── Token budget enforcement ───────────────────────────────────────────
const MAX_BULLETS = 5;
const MAX_WORDS = 117; // Reserve 3 words for sentinel so total injected prompt stays ≤ 120

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function countBullets(lines: string[]): number {
  return lines.filter((l) => l.startsWith("-")).length;
}

function enforceBudget(block: string): string {
  const lines = block.split("\n");
  if (countBullets(lines) > MAX_BULLETS || countWords(block) > MAX_WORDS) {
    // Trim to budget: keep header + first MAX_BULLETS bullet lines
    const header: string[] = [];
    const bullets: string[] = [];
    for (const line of lines) {
      if (line.startsWith("-") && bullets.length < MAX_BULLETS) {
        bullets.push(line);
      } else if (!line.startsWith("-")) {
        if (bullets.length === 0) header.push(line);
      }
    }
    const trimmed = [...header, ...bullets].join("\n");
    if (countWords(trimmed) <= MAX_WORDS) return trimmed;
    // Hard truncate to MAX_WORDS
    const words = trimmed.split(/\s+/).slice(0, MAX_WORDS);
    return words.join(" ");
  }
  return block;
}

// ── File bucket derivation ─────────────────────────────────────────────

function deriveFileBucket(pathKind: PathKind): string {
  return pathKind;
}

// ── PromptContext ──────────────────────────────────────────────────────

export interface PromptContext {
  recentEdits: Array<{ path: string; kind: PathKind }>;
  workspaceHealth?: WorkspaceHealth;
  hasRecentKbEdit?: boolean;
  recentCommentSuggestion?: CommentAnalysisResult | null;
  /** Posture detected by repo-posture detection */
  posture?: RepoPosture;
  /** Risk class from risk-classifier */
  riskClass?: RiskClass;
  /** Cache instance for skip-repeated-guidance */
  cache?: GuidanceCache;
  /** Workspace root for cache key */
  workspaceRoot?: string;
  /** Branch for cache key */
  branch?: string;
  /** Whether to append completion reminder for risky classes */
  completionReminder?: boolean;
  /** Merged maintenance-degraded state (static + runtime overlay) */
  maintenanceDegraded?: boolean;
  /** Degraded-mode logging policy */
  degradedMode?: "warn-once" | "structured-only";
  /** Whether to show the degraded advisory block this invocation */
  showDegradedAdvisory?: boolean;
}

// ── Guidance blocks by risk class ──────────────────────────────────────

const GUIDANCE_BY_RISK: Record<RiskClass, string | null> = {
  safe_docs_only: null,
  safe_test_only: null,

  kb_doc_structural: `📚 **Kibi documentation changes detected**

When editing KB documentation:
- Maintain traceability — link entities using relationships: specified_by, verified_by, etc.
- Validate — Use kb_check after making changes to catch integrity issues.
- Follow entity patterns — ensure each entity has proper frontmatter.`,

  req_policy_candidate: `📋 **Requirement changes detected**

Requirement edits need policy alignment. Run kb_check with required-fields and no-dangling-refs. For priority:must requirements, also run must-priority-coverage.
- Keep artifacts separate (REQ, SCEN, TEST)
- Add verification: create or update linked SCEN and TEST entities`,

  behavior_candidate: `📝 **Code changes detected**

Code changes need traceability. Use kb_search for context. For test/e2e symbols, prefer durable relationships (e.g. via symbols.yaml with covered_by + validates/verified_by); inline // implements REQ-xxx comments remain optional and backward-compatible.`,

  traceability_candidate: `📝 **Code changes detected**

Code changes need traceability. Use kb_search for context. For test/e2e symbols, prefer durable relationships (e.g. via symbols.yaml with covered_by + validates/verified_by); inline // implements REQ-xxx comments remain optional and backward-compatible.
- Durable knowledge comment detected — route to KB instead of inline comments
- Use kb_upsert for FACT, ADR, or REQ entities as appropriate`,

  manual_kb_edit: `⚠️  **WARNING: Direct .kb/ edits bypass validation**

The Kibi knowledge base is managed through public MCP tools. Direct manual edits to .kb/** can cause inconsistencies.
- Use kb_upsert to create/update entities
- Use kb_delete to remove entities
- Use kb_check to validate consistency`,
};

// ── Posture overrides ──────────────────────────────────────────────────

function postureGuidance(posture: RepoPosture): string | null {
  switch (posture) {
    case "vendored_only":
      // Minimal guidance only, no bootstrap nags
      return null;
    case "root_uninitialized":
      return `🔧 **Bootstrap required**

This repository does not appear to have Kibi initialized. Agents should:
- Use \`/init-kibi\` for retroactive bootstrap of existing repos (preferred MCP command)
- Ask the user/operator to run setup or repair outside this session if \`/init-kibi\` is insufficient

Do not run \`kibi\` CLI commands directly; use the public MCP tools (kb_search, kb_query, kb_status, kb_find_gaps, kb_coverage, kb_graph, kb_upsert, kb_delete, kb_check).`;
    case "root_partial":
      return `⚠️  **Partial KB setup detected**

Root .kb/config.json exists but some configured KB targets are missing. Guidance remains advisory until the user/operator restores the configured KB targets.`;
    default:
      return null;
  }
}

// ── Main guidance builder ──────────────────────────────────────────────

/**
 * Build prompt guidance block based on posture, risk class, and cache state.
 */
function buildContextualGuidance(context: PromptContext): string {
  const posture = context.posture ?? "root_active";
  const riskClass = context.riskClass;
  const showDegraded =
    context.showDegradedAdvisory === true &&
    context.maintenanceDegraded === true &&
    context.degradedMode === "warn-once";

  // ── Single-block priority selection ──
  // Priority order (highest wins): manual_kb_edit > posture > risk_class > safe/none
  let selectedBlock: string | null = null;

  // Priority 1: vendored_only → sentinel only (unless degraded advisory forced)
  if (posture === "vendored_only" && !showDegraded) {
    return SENTINEL;
  }

  // Priority 2: manual_kb_edit — always fires, never cache-suppressed
  if (context.hasRecentKbEdit || riskClass === "manual_kb_edit") {
    selectedBlock = GUIDANCE_BY_RISK.manual_kb_edit;
  }
  // Priority 3: Posture warnings for non-active states — not cache-suppressed
  else if (posture === "root_uninitialized" || posture === "root_partial") {
    const postureBlock = postureGuidance(posture);
    if (postureBlock) selectedBlock = postureBlock;
  }
  // Priority 4: Legacy workspace health bootstrap (only when no posture) — not cache-suppressed
  else if (!context.posture && context.workspaceHealth?.needsBootstrap) {
    selectedBlock = `🔧 **Bootstrap required**

This repository does not appear to have Kibi initialized. Agents should:
- Use \`/init-kibi\` for retroactive bootstrap of existing repos (preferred MCP command)
- Ask the user/operator to run setup or repair outside this session if \`/init-kibi\` is insufficient

Do not run \`kibi\` CLI commands directly; use the public MCP tools (kb_search, kb_query, kb_status, kb_find_gaps, kb_coverage, kb_graph, kb_upsert, kb_delete, kb_check).`;
  }
  // Advisory guidance: check cache before selecting, since these blocks can be safely suppressed
  else {
    // Cache check: skip repeated advisory guidance — only after critical signals are handled above
    // Allow degraded advisory to bypass cache so it is always visible
    if (
      !showDegraded &&
      context.cache &&
      context.workspaceRoot &&
      context.branch &&
      riskClass
    ) {
      const lastEdit = context.recentEdits[context.recentEdits.length - 1];
      const key: CacheKey = {
        workspaceRoot: context.workspaceRoot,
        branch: context.branch,
        posture,
        riskClass,
        fileBucket: deriveFileBucket(lastEdit?.kind ?? "unknown"),
      };
      if (context.cache.isSatisfied(key)) {
        return SENTINEL; // skip guidance — recently satisfied
      }
    }

    // Priority 5: Risk-class-driven guidance (for non-safe classes)
    if (
      riskClass &&
      riskClass !== "safe_docs_only" &&
      riskClass !== "safe_test_only"
    ) {
      // For behavior/traceability with comment suggestions, use suggestion guidance
      if (
        (riskClass === "behavior_candidate" ||
          riskClass === "traceability_candidate") &&
        context.recentCommentSuggestion
      ) {
        selectedBlock = buildCommentSuggestionGuidance(
          context.recentCommentSuggestion,
        );
      } else {
        const block = GUIDANCE_BY_RISK[riskClass];
        if (block) selectedBlock = block;
      }
    }
    // Priority 6: Legacy path-kind fallback (when no risk class)
    else if (!riskClass) {
      const codeEdits = context.recentEdits.filter((e) => e.kind === "code");
      const reqEdits = context.recentEdits.filter(
        (e) => e.kind === "requirement",
      );
      const kbDocEdits = context.recentEdits.filter((e) =>
        [
          "requirement",
          "scenario",
          "test",
          "adr",
          "fact",
          "flag",
          "event",
          "symbol",
        ].includes(e.kind),
      );

      if (codeEdits.length > 0) {
        const suggestion = context.recentCommentSuggestion;
        if (suggestion) {
          selectedBlock = buildCommentSuggestionGuidance(suggestion);
        } else {
          selectedBlock = `📝 **Code changes detected**

Before implementing or explaining code:
1. **Discover first** - Run kb_search to find related requirements, ADRs, tests, facts, and symbols.
2. **Follow up exactly** - Run kb_query by sourceFile, id, type, or tags once you know what you need.
3. **Prefer Kibi over comments** - Store durable knowledge in KB entities instead of inline comments.
4. **Add traceability** - For test/e2e symbols, prefer durable symbol/test/requirement relationships (e.g. via symbols.yaml with covered_by + validates/verified_by); inline // implements REQ-xxx comments remain optional and backward-compatible for quick code-only changes.

If you're adding long explanatory comments, consider routing that knowledge to:
- \`FACT\` for domain invariants, properties, limits, cardinalities
- \`ADR\` for technical decisions, tradeoffs, rationale
- \`REQ\` for system behavior requirements`;
        }
      } else if (reqEdits.length > 0) {
        selectedBlock = GUIDANCE_BY_RISK.req_policy_candidate;
      } else if (kbDocEdits.length > 0) {
        selectedBlock = GUIDANCE_BY_RISK.kb_doc_structural;
      }
    }
  }

  // Source-linked micro-brief: insert after header line for code risk classes
  // Inserting after the header (not prepending before it) preserves the header
  // under enforceBudget's trimming logic, which only collects non-bullet lines
  // before the first bullet.
  if (
    selectedBlock &&
    (riskClass === "behavior_candidate" ||
      riskClass === "traceability_candidate") &&
    context.workspaceRoot
  ) {
    try {
      const lastEdit = context.recentEdits[context.recentEdits.length - 1];
      if (lastEdit?.path) {
        const editedPath = lastEdit.path;
        const absEdited = path.isAbsolute(editedPath)
          ? editedPath
          : path.join(context.workspaceRoot, editedPath);
        const linkedIds = getSourceLinkedRequirementIds(
          context.workspaceRoot,
          absEdited,
        );
        if (linkedIds.length >= 1 && linkedIds.length <= 3) {
          const headerEnd = selectedBlock.indexOf("\n");
          if (headerEnd !== -1) {
            selectedBlock = `${selectedBlock.slice(0, headerEnd + 1)}- Existing Kibi links: ${linkedIds.join(", ")}\n${selectedBlock.slice(headerEnd + 1)}`;
          } else {
            selectedBlock = `${selectedBlock}\n- Existing Kibi links: ${linkedIds.join(", ")}`;
          }
        }
      }
    } catch {
      // Non-fatal: source-linked brief is best-effort
    }
  }

  // Inject degraded advisory block for warn-once mode
  if (showDegraded) {
    const advisory = `⚠️  **Maintenance degraded**

The Kibi workspace is in a maintenance-degraded state. Guidance remains advisory.`;
    if (selectedBlock) {
      selectedBlock = `${advisory}\n\n${selectedBlock}`;
    } else {
      selectedBlock = advisory;
    }
  }

  // Record cache after generating (advisory, non-blocking)
  // Do not cache degraded-advisory-only emissions
  if (
    !showDegraded &&
    context.cache &&
    context.workspaceRoot &&
    context.branch &&
    riskClass
  ) {
    const lastEdit = context.recentEdits[context.recentEdits.length - 1];
    const key: CacheKey = {
      workspaceRoot: context.workspaceRoot,
      branch: context.branch,
      posture,
      riskClass,
      fileBucket: deriveFileBucket(lastEdit?.kind ?? "unknown"),
    };
    context.cache.recordSatisfied(key, "guidance");
  }

  // Append completion reminder for risky classes when enabled
  const REMINDER_RISK_CLASSES: RiskClass[] = [
    "behavior_candidate",
    "traceability_candidate",
    "req_policy_candidate",
  ];
  if (
    selectedBlock &&
    context.completionReminder === true &&
    !context.maintenanceDegraded &&
    riskClass &&
    REMINDER_RISK_CLASSES.includes(riskClass) &&
    posture !== "root_uninitialized" &&
    posture !== "root_partial"
  ) {
    selectedBlock = `${selectedBlock}\n- Run \`kb_check\` before completing this task.`;
  }

  // Return: sentinel + one targeted block (or just sentinel if no block)
  return selectedBlock
    ? `${SENTINEL}\n\n${enforceBudget(selectedBlock)}`
    : SENTINEL;
}

// ── Comment suggestion guidance (legacy compat) ────────────────────────

function buildCommentSuggestionGuidance(
  suggestion: CommentAnalysisResult,
): string {
  switch (suggestion.suggestionType) {
    case "fact":
      return `🎯 **Durable knowledge detected: FACT**

Your recent code edit contains a comment that looks like a **domain invariant** (properties, limits, defaults, or cardinality constraints).

**Action**: Instead of inline comments, route this to a FACT entity:
- Create \`documentation/facts/FACT-xxx.md\` with the invariant
- Link it to relevant requirements
- Reference the FACT in code with a comment

This keeps domain truths centralized and searchable.`;
    case "adr":
      return `🎯 **Durable knowledge detected: ADR**

Your recent code edit contains a comment that looks like a **technical decision** (tradeoffs, rationale, or architecture choices).

**Action**: Instead of inline comments, route this to an ADR entity:
- Create \`documentation/adr/ADR-xxx.md\` documenting the decision
- Include context, options considered, and the chosen approach
- Link to constrained code symbols

This preserves decision context for future maintainers.`;
    case "req":
      return `🎯 **Durable knowledge detected: REQ**

Your recent code edit contains a comment that looks like **behavior intent** (system capabilities or user-facing requirements).

**Action**: Instead of inline comments, route this to a REQ entity:
- Create \`documentation/requirements/REQ-xxx.md\` with the behavior description
- Add SCEN and TEST entities for specification and verification
- Link code to requirements: for test/e2e symbols prefer durable relationships (e.g. via symbols.yaml with covered_by + validates/verified_by); inline // implements REQ-xxx comments remain optional and backward-compatible

This ensures behavior is documented and traceable.`;
    default:
      return `📝 **Code changes detected**

Before implementing or explaining code:
1. **Discover first** - Run kb_search to find related requirements, ADRs, tests, facts, and symbols.
2. **Follow up exactly** - Run kb_query by sourceFile, id, type, or tags once you know what you need.
3. **Prefer Kibi over comments** - Store durable knowledge in KB entities instead of inline comments.
4. **Add traceability** - For test/e2e symbols, prefer durable symbol/test/requirement relationships (e.g. via symbols.yaml with covered_by + validates/verified_by); inline // implements REQ-xxx comments remain optional and backward-compatible for quick code-only changes.`;
  }
}

// ── Base guidance (no context) ─────────────────────────────────────────

/**
 * Build the static guidance block (original behavior).
 */
const BASE_GUIDANCE = `${SENTINEL}
This project uses Kibi (via MCP). Prefer storing durable knowledge in Kibi over code comments.

Before changing behavior: use kb_search for discovery, then kb_query by sourceFile, id, type, or tags for exact follow-up; do not rely on undocumented tools.

Keep changed symbols traceable: for test and e2e code, prefer durable symbol/test/requirement relationships (e.g. via \`symbols.yaml\`); inline \`// implements REQ-xxx\` comments remain optional and backward-compatible for quick code-only changes.

Run kb_check after KB mutations.

Dogfood note for this repo: OpenCode here uses local built \`kibi-mcp\` and \`kibi-opencode\` artifacts. If you change package versions or local package wiring, run \`bun run build\` before relying on OpenCode in this workspace.

**Kibi-first workflow:**
1. **Discover**: Run kb_search to find relevant requirements, ADRs, tests, facts, and symbols.
2. **Confirm**: Run kb_query with sourceFile, id, type, or tags once you know the exact follow-up target.
3. **Inspect freshness**: Run kb_status when branch or stale-state confidence matters.
4. **Document intent**: If you are about to explain code, STOP. Route that explanation to kb_upsert instead of inline comments.
5. **Link during work**: When creating KB entities, include relationship rows: specified_by (req→scenario), verified_by (req→test), implements (symbol→req), covered_by (symbol→test).
6. **Validate**: Run kb_check after KB mutations to catch violations early.

**Public Kibi tools only:** kb_search, kb_query, kb_status, kb_find_gaps, kb_coverage, kb_graph, kb_upsert, kb_delete, kb_check.

Do not invoke Kibi CLI commands directly from the agent.

Bootstrap existing repos: use \`/init-kibi\` to run the retroactive initialization workflow.`;

/**
 * Build prompt with contextual guidance based on posture, risk class, and cache state.
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
