import * as path from "node:path";
import type { CommentAnalysisResult } from "./comment-analysis.js";
// implements REQ-opencode-smart-enforcement-v1, REQ-opencode-kibi-plugin-v1, REQ-opencode-agent-mcp-only
import type { KibiConfig } from "./config.js";
import { isPluginEnabled } from "./config.js";
import type { CacheKey, GuidanceCache } from "./guidance-cache.js";
import {
  type InitKibiCommandCapability,
  getInitKibiCommandCapability,
} from "./init-kibi-capability.js";
import type { KbFreshnessEvaluation } from "./kb-freshness-state.js";
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

const ENTITY_ID_RE =
  /\b(?:REQ|SYM|SCEN|TEST|ADR|FACT|FLAG|EVT)-[A-Za-z0-9_-]+\b/g;

// implements REQ-opencode-file-context-guidance-v1
function hasOverlappingEntityIds(textA: string, textB: string): boolean {
  const idsA = new Set(textA.match(ENTITY_ID_RE) ?? []);
  const idsB = textB.match(ENTITY_ID_RE) ?? [];
  return idsB.length > 0 && idsB.some((id) => idsA.has(id));
}

function enforceBudget(
  block: string,
  maxBullets: number = MAX_BULLETS,
): string {
  const lines = block.split("\n");
  if (countBullets(lines) > maxBullets || countWords(block) > MAX_WORDS) {
    // Trim to budget: keep header + first maxBullets bullet lines
    const header: string[] = [];
    const bullets: string[] = [];
    for (const line of lines) {
      if (line.startsWith("-") && bullets.length < maxBullets) {
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

function insertBulletAfterHeader(block: string, bullet: string): string {
  const headerEnd = block.indexOf("\n");
  if (headerEnd === -1) return `${block}\n${bullet}`;
  return `${block.slice(0, headerEnd + 1)}${bullet}\n${block.slice(headerEnd + 1)}`;
}

// ── File bucket derivation ─────────────────────────────────────────────

function deriveFileBucket(pathKind: PathKind): string {
  return pathKind;
}

function getFocusEdit(
  context: PromptContext,
): { path: string; kind: PathKind } | undefined {
  return (
    context.focusEdit ?? context.recentEdits[context.recentEdits.length - 1]
  );
}

function buildInitKibiBootstrapReference(
  capability: InitKibiCommandCapability = getInitKibiCommandCapability(),
): string {
  if (capability.supported) {
    return "Bootstrap existing repos: when the Kibi OpenCode plugin is active and native injection is supported, `/init-kibi` is the canonical short alias; `/kibi:init-kibi:mcp` remains the namespaced MCP fallback for the retroactive initialization (`kb_autopilot_generate`) workflow.";
  }

  return "Bootstrap existing repos: this host does not support native `/init-kibi` injection, so Kibi must fail closed and does not register a fake native alias; use `/kibi:init-kibi:mcp` for the retroactive initialization (`kb_autopilot_generate`) workflow.";
}

function buildBootstrapRequiredBody(
  capability: InitKibiCommandCapability = getInitKibiCommandCapability(),
): string {
  const commandBullet = capability.supported
    ? "- When the Kibi OpenCode plugin is active and native injection is supported, use `/init-kibi` as the canonical short alias; `/kibi:init-kibi:mcp` remains the namespaced MCP fallback."
    : "- This host does not support native `/init-kibi` injection. Kibi must fail closed and does not register a fake native alias; use `/kibi:init-kibi:mcp` instead.";

  return `This repository does not appear to have Kibi initialized. Agents should:\n${commandBullet}\n- The workflow uses \`kb_autopilot_generate\` for read-only synthesis; always preview and get approval before writes.\n- Ask the user/operator to run setup or repair outside this session if bootstrap is insufficient.\n- For comprehensive Kibi usage guidance, use \`kb_skills_load\` with skill id \`kibi-usage\`.\n\nUse public MCP tools only: \`kb_autopilot_generate\`, \`kb_search\`, \`kb_query\`, \`kb_status\`, \`kb_find_gaps\`, \`kb_coverage\`, \`kb_graph\`, \`kb_upsert\`, \`kb_delete\`, \`kb_check\`, \`kb_skills_load\`.`;
}

// ── PromptContext ──────────────────────────────────────────────────────

export interface PromptContext {
  recentEdits: Array<{ path: string; kind: PathKind }>;
  focusEdit?: { path: string; kind: PathKind } | null;
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
  /** File-operation reminder from lifecycle and e2e coverage signals */
  fileOperationReminder?: {
    path: string;
    lifecycleReminder: string | null;
    e2eReminder: string | null;
  };
  /** Hard-mode checkpoint block that must take prompt priority over advisory guidance. */
  hardGateBlock?: {
    shownPaths: string[];
    remainingCount: number;
    reason?: string;
  };
  /** KB freshness evaluation from evidence store */
  kbFreshness?: KbFreshnessEvaluation;
  /** Paths changed for freshness evaluation (capped at 5) */
  freshnessChangedPaths?: string[];
}

function buildHardGateBlock(
  block: NonNullable<PromptContext["hardGateBlock"]>,
): string {
  const pathLines = block.shownPaths.map((path) => `- \`${path}\``);
  if (block.remainingCount > 0) {
    pathLines.push(`- +${block.remainingCount} more dirty files`);
  }
  const reasonLine = block.reason ? `Reason: ${block.reason}.` : null;

  return [
    "🛑 Kibi hard gate blocked",
    "STOP implementation until this authoritative Kibi checkpoint is satisfied.",
    reasonLine,
    "Affected files:",
    ...pathLines,
    "MCP-only recovery steps:",
    "- Run `kb_search` for impacted requirements, tests, ADRs, and facts.",
    "- Run `kb_query` with `sourceFile` for each affected file.",
    "- Run `kb_status` if branch or snapshot freshness matters.",
    "- Run `kb_upsert` for required traceability, relationship, or fact updates.",
    "- Run `kb_check` before continuing.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
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

Production code: use \`implements\` (symbol→req) for requirement ownership. Test code: use \`executable_for\` (symbol→test).
- \`covered_by\` is coverage evidence only
- Prefer scenario-first: req→scenario→test when scenarios exist
- Kibi impact evidence is required before completion/commit`,

  traceability_candidate: `📝 **Code changes detected**

Production code: use \`implements\` (symbol→req) for requirement ownership. Test code: use \`executable_for\` (symbol→test).
- \`covered_by\` is coverage evidence only
- Prefer scenario-first: req→scenario→test when scenarios exist
- Route durable knowledge comments to KB entities, not inline comments
- documentation/symbols.yaml refresh is required when extraction output changes; do not revert as scope creep`,

  manual_kb_edit: `⚠️  **WARNING: Direct .kb/ edits bypass validation**

The Kibi knowledge base is managed through public MCP tools. Direct manual edits to .kb/** can cause inconsistencies.
- Use kb_upsert to create/update entities
- Use kb_delete to remove entities
- Use kb_check to validate consistency`,
};

// ── Posture overrides ──────────────────────────────────────────────────

export function postureGuidance(
  posture: RepoPosture,
  capability: InitKibiCommandCapability = getInitKibiCommandCapability(),
): string | null {
  // implements REQ-opencode-prompt-injection
  switch (posture) {
    case "vendored_only":
      // Minimal guidance only, no bootstrap nags
      return null;
    case "root_uninitialized":
      return `🔧 **Bootstrap required**

${buildBootstrapRequiredBody(capability)}`;
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
function buildContextualGuidance(
  context: PromptContext,
  capability: InitKibiCommandCapability = getInitKibiCommandCapability(),
): string {
  if (context.hardGateBlock) {
    return `${SENTINEL}\n\n${buildHardGateBlock(context.hardGateBlock)}`;
  }

  const posture = context.posture ?? "root_active";
  const riskClass = context.riskClass;
  const showDegraded =
    context.showDegradedAdvisory === true &&
    context.maintenanceDegraded === true &&
    context.degradedMode === "warn-once";
  const fileOpReminder = context.fileOperationReminder;
  const hasFileOpReminders =
    fileOpReminder !== undefined &&
    (fileOpReminder.lifecycleReminder !== null ||
      fileOpReminder.e2eReminder !== null);

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
    const postureBlock = postureGuidance(posture, capability);
    if (postureBlock) selectedBlock = postureBlock;
  } else if (!context.posture && context.workspaceHealth?.needsBootstrap) {
    selectedBlock = `🔧 **Bootstrap required**

${buildBootstrapRequiredBody(capability)}`;
    // Advisory guidance: check cache before selecting, since these blocks can be safely suppressed
  } else {
    // Cache check: skip repeated advisory guidance — only after critical signals are handled above
    // Allow degraded advisory to bypass cache so it is always visible
    // File-operation reminders also bypass cache (per-path suppression handled by caller)
    let cacheSuppressedSemantic = false;
    if (
      !showDegraded &&
      context.cache &&
      context.workspaceRoot &&
      context.branch &&
      !context.kbFreshness?.requiresEvidence &&
      riskClass
    ) {
      const focusEdit = getFocusEdit(context);
      const key: CacheKey = {
        workspaceRoot: context.workspaceRoot,
        branch: context.branch,
        posture,
        riskClass,
        fileBucket: deriveFileBucket(focusEdit?.kind ?? "unknown"),
      };
      if (context.cache.isSatisfied(key)) {
        if (hasFileOpReminders) {
          cacheSuppressedSemantic = true;
        } else {
          return SENTINEL; // skip guidance — recently satisfied
        }
      }
    }

    // Priority 5: Risk-class-driven guidance (for non-safe classes)
    if (
      !cacheSuppressedSemantic &&
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
    else if (!cacheSuppressedSemantic && !riskClass) {
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
1. **Discover**: Run kb_search for REQ, ADR, TEST, FACT. Decompose broad queries (e.g., "Apple Sign-In").
2. **Follow up exactly** - Run kb_query by sourceFile, id, type, or tags once you know what you need.
3. **Prefer Kibi over comments** - Store durable knowledge in KB entities instead of inline comments.
4. **Add traceability** - Production code: \`implements\` (symbol→req) for ownership. Test code: \`executable_for\`. \`covered_by\` is coverage evidence only for production symbols.

If you're adding long explanatory comments, consider routing that knowledge to:
- \`FACT\` for strict domain facts (invariants, properties, limits, cardinalities); bug/workaround notes use \`fact_kind: observation\` or \`meta\`
- \`ADR\` for technical decisions, tradeoffs, rationale
- \`REQ\` for system behavior requirements`;
        }
      } else if (reqEdits.length > 0) {
        selectedBlock = GUIDANCE_BY_RISK.req_policy_candidate;
      } else if (kbDocEdits.length > 0) {
        selectedBlock = GUIDANCE_BY_RISK.kb_doc_structural;
      }
    }
  } // closing brace for Priority 2-4 else block starting at 187

  // Source-linked context: insert after header line for code risk classes
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
      const focusEdit = getFocusEdit(context);
      if (focusEdit?.path) {
        const editedPath = focusEdit.path;
        const absEdited = path.isAbsolute(editedPath)
          ? editedPath
          : path.join(context.workspaceRoot, editedPath);
        const linkedIds = getSourceLinkedRequirementIds(
          context.workspaceRoot,
          absEdited,
        );
        if (linkedIds.length >= 1 && linkedIds.length <= 3) {
          selectedBlock = insertBulletAfterHeader(
            selectedBlock,
            `- Existing Kibi links: ${linkedIds.join(", ")}`,
          );
        }
      }
    } catch {
      // Non-fatal: source-linked context is best-effort
    }
  }

  // ── File-operation reminder folding ─────────────────────────────────
  // File-operation reminders bypass generic GuidanceCache suppression but
  // are subject to prompt budget trimming. Per-path suppression is handled
  // by the caller via file-operation-state hasShown/markShown.
  // implements REQ-opencode-file-context-guidance-v1
  if (hasFileOpReminders && fileOpReminder) {
    const foBullets: string[] = [];

    if (fileOpReminder.lifecycleReminder) {
      // Skip lifecycleReminder if source-linked context already shows the same IDs
      const hasSourceLinked =
        selectedBlock?.includes("- Existing Kibi links:") === true;
      const lifecycleHasEntities =
        fileOpReminder.lifecycleReminder.includes("Kibi entities:");
      const overlapsSourceLinked =
        hasSourceLinked &&
        lifecycleHasEntities &&
        selectedBlock !== null &&
        hasOverlappingEntityIds(
          selectedBlock,
          fileOpReminder.lifecycleReminder,
        );
      if (!overlapsSourceLinked) {
        foBullets.push(fileOpReminder.lifecycleReminder);
      }
    }

    if (fileOpReminder.e2eReminder) {
      foBullets.push(fileOpReminder.e2eReminder);
    }

    if (foBullets.length > 0) {
      if (selectedBlock) {
        // Fold into existing semantic block
        for (const bullet of foBullets) {
          selectedBlock = insertBulletAfterHeader(selectedBlock, bullet);
        }
      } else {
        // Create file-operation-only compact block
        selectedBlock = `🧠 **File operation detected**\n${foBullets.join("\n")}`;
      }
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
    const focusEdit = getFocusEdit(context);
    const key: CacheKey = {
      workspaceRoot: context.workspaceRoot,
      branch: context.branch,
      posture,
      riskClass,
      fileBucket: deriveFileBucket(focusEdit?.kind ?? "unknown"),
    };
    context.cache.recordSatisfied(key, "guidance");
  }

  const REMINDER_RISK_CLASSES: RiskClass[] = [
    "behavior_candidate",
    "traceability_candidate",
    "req_policy_candidate",
  ];
  const reminderWillBeAppended =
    !!selectedBlock &&
    context.completionReminder === true &&
    !context.maintenanceDegraded &&
    riskClass != null &&
    REMINDER_RISK_CLASSES.includes(riskClass) &&
    posture !== "root_uninitialized" &&
    posture !== "root_partial";
  const effectiveMaxBullets = reminderWillBeAppended
    ? MAX_BULLETS - 1
    : MAX_BULLETS;

  // Apply budget enforcement before appending the completion reminder so the
  // reminder bullet is never silently trimmed when bullet count exceeds MAX_BULLETS.
  const budgeted = selectedBlock
    ? enforceBudget(selectedBlock, effectiveMaxBullets)
    : null;

  // Append completion reminder for risky classes when enabled
  let finalBlock = budgeted;
  if (
    finalBlock &&
    context.completionReminder === true &&
    !context.maintenanceDegraded &&
    riskClass &&
    REMINDER_RISK_CLASSES.includes(riskClass) &&
    posture !== "root_uninitialized" &&
    posture !== "root_partial"
  ) {
    finalBlock = `${finalBlock}\n- Kibi impact evidence is required before completion/commit: run \`kb_check\` before completing this task.`;
  }

  // Prepend KB freshness block when evidence is required
  if (context.kbFreshness?.requiresEvidence) {
    const changedListing = context.freshnessChangedPaths?.length
      ? `Changed: ${context.freshnessChangedPaths
          .slice(0, 5)
          .map((p) => `\`${p}\``)
          .join(", ")}`
      : null;
    const freshnessLines = [
      "🧠 **Kibi freshness required**",
      changedListing,
      `State: ${context.kbFreshness.state}. ${context.kbFreshness.reason}`,
      ...(context.kbFreshness.missingEvidence.length > 0
        ? [`Missing: ${context.kbFreshness.missingEvidence.join(", ")}`]
        : []),
      "Resolution:",
      "- **KB updated**: run `kb_search` for discovery, then `kb_upsert`/`kb_delete` for mutations, then `kb_check`.",
      "- **No KB impact**: include a no-impact rationale in your final report after source-linked discovery via `kb_search`/`kb_query(sourceFile=...)` and `kb_check`.",
    ]
      .filter(Boolean)
      .join("\n");
    finalBlock = finalBlock
      ? `${freshnessLines}\n\n${finalBlock}`
      : freshnessLines;
  }

  // Return: sentinel + one targeted block (or just sentinel if no block)
  return finalBlock ? `${SENTINEL}\n\n${finalBlock}` : SENTINEL;
}

// ── Comment suggestion guidance (legacy compat) ────────────────────────

function buildCommentSuggestionGuidance(
  suggestion: CommentAnalysisResult,
): string {
  switch (suggestion.suggestionType) {
    case "fact":
      return `🎯 **Durable knowledge detected: FACT**

Your recent code edit contains a comment that looks like a **strict domain fact** (invariants, properties, limits, defaults, or cardinality constraints).

**Action**: Route to a FACT entity in the strict fact lane:
- Create \`documentation/facts/FACT-xxx.md\` with the invariant (use \`constrains\` + \`requires_property\` for contradiction-safe reasoning)
- Bug/workaround notes: use \`fact_kind: observation\` or \`meta\` instead — these are non-blocking and excluded from contradiction inference
- Link it to relevant requirements

This keeps domain truths centralized, searchable, and contradiction-safe.`;
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
- Link code: production uses \`implements\` (symbol→req) for ownership; test code uses \`executable_for\`; \`covered_by\` is coverage evidence only

This ensures behavior is documented and traceable.`;
    default:
      return `📝 **Code changes detected**

Before implementing or explaining code:
1. **Discover**: Run kb_search for REQ, ADR, TEST, FACT. Decompose broad queries (e.g., "Apple Sign-In").
2. **Follow up exactly** - Run kb_query by sourceFile, id, type, or tags once you know what you need.
3. **Prefer Kibi over comments** - Store durable knowledge in KB entities instead of inline comments.
4. **Add traceability** - Production code: \`implements\` (symbol→req) for ownership. Test code: \`executable_for\`. \`covered_by\` is coverage evidence only for production symbols.`;
  }
}

// ── Base guidance (no context) ─────────────────────────────────────────

/**
 * Build the static guidance block (original behavior).
 */
function buildBaseGuidance(
  capability: InitKibiCommandCapability = getInitKibiCommandCapability(),
): string {
  return `${SENTINEL}
This project uses Kibi (via MCP). Prefer storing durable knowledge in Kibi over code comments.

Before changing behavior: use kb_search for discovery, then kb_query by sourceFile, id, type, or tags for exact follow-up; do not rely on undocumented tools.

Keep changed symbols traceable: production code uses \`implements\` (symbol→req) for ownership; test code uses \`executable_for\`; \`covered_by\` is coverage evidence only. Inline \`// implements REQ-xxx\` comments remain backward-compatible.

Run kb_check after KB mutations.

Dogfood note for this repo: OpenCode here uses local built \`kibi-mcp\` and \`kibi-opencode\` artifacts. If you change package versions or local package wiring, run \`bun run build\` before relying on OpenCode in this workspace.

**Kibi-first workflow:**
1. **Discover**: Run kb_search for REQ, ADR, TEST, FACT. Decompose broad queries (e.g., "Apple Sign-In").
2. **Confirm**: Run kb_query with sourceFile, id, type, or tags once you know the exact follow-up target.
3. **Inspect freshness**: Run kb_status when branch or stale-state confidence matters.
4. **Document intent**: If you are about to explain code, STOP. Route that explanation to kb_upsert instead of inline comments.
5. **Link during work**: When creating KB entities, include relationship rows: specified_by (req→scenario), implements (symbol→req for ownership), covered_by (symbol→test for coverage), executable_for (test code→test).
6. **Validate**: Run kb_check after KB mutations to catch violations early.
7. **Before completion/commit**: Kibi impact evidence is required before completion/commit. If extraction output changes, refresh documentation/symbols.yaml and do not revert that update as scope creep.

**Public Kibi tools only:** kb_autopilot_generate, kb_search, kb_query, kb_status, kb_find_gaps, kb_coverage, kb_graph, kb_upsert, kb_delete, kb_check, kb_skills_load.

For comprehensive Kibi usage guidance (relationships, fact lanes, workflows), use \`kb_skills_load\` with skill id \`kibi-usage\`.

Do not invoke Kibi CLI commands directly from the agent.

${buildInitKibiBootstrapReference(capability)}`;
}

/**
 * Build prompt with contextual guidance based on posture, risk class, and cache state.
 */
export function buildPrompt(
  context?: PromptContext,
  capability: InitKibiCommandCapability = getInitKibiCommandCapability(),
): string {
  if (!context) {
    return buildBaseGuidance(capability).trim();
  }
  return buildContextualGuidance(context, capability).trim();
}

/**
 * Inject prompt guidance if not already present.
 */
export function injectPrompt(
  current: string,
  config: KibiConfig,
  context?: PromptContext,
  capability: InitKibiCommandCapability = getInitKibiCommandCapability(),
): string {
  if (!config.prompt.enabled || !isPluginEnabled(config)) {
    return current;
  }
  if (current.includes(SENTINEL)) {
    return current;
  }
  return `${current}\n\n${buildPrompt(context, capability)}`;
}

export { SENTINEL };
