import {
  ADVERTISED_DESCRIPTION,
  ADVERTISED_OPEN,
} from "../advertised-schema.js";
import { executeCheck } from "../check-executor.js";
import type { OperationSpec } from "../types.js";
import {
  SELECTABLE_RULES_ALLOWED,
  SELECTABLE_RULE_NAMES,
} from "./check-rules.generated.js";

export const checkSpec = {
  name: "kb_check",
  cliName: "check",
  description:
    "Run KB validation rules and return violations, quality diagnostics, and typed kibi.migration-plan.v2 actions. Use before or after mutations and after source edits; checks remain read-only and never infer or apply actions from prose suggestions.",
  businessInputSchema: {
    type: "object",
    properties: {
      rules: {
        type: "array",
        items: {
          type: "string",
          enum: [...SELECTABLE_RULE_NAMES],
          [ADVERTISED_OPEN]: true,
        },
        description: `Optional rule subset. Allowed: ${SELECTABLE_RULES_ALLOWED}. If omitted, server runs canonical and advisory rules plus the full-KB qualityDiagnostics audit scan, including usage telemetry acceptance when evidence exists; migration rules run only when explicitly selected. Advisory and migration findings are non-blocking qualityDiagnostics. If supplied, server preserves scoped validation and skips the full-KB advisory scan.`,
        [ADVERTISED_DESCRIPTION]:
          "Optional rule names (an unknown one is refused with the list). Omit to run every rule plus the full-KB audit.",
      },
      sourceFiles: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional repo-relative source files to inspect for early impact diagnostics. Use with includeImpactDiagnostics after meaningful source edits. Scopes the result to those files: blocking violations are listed for entities the changed symbols link to, entities whose KB document changed, and store-level rules; the rest are counted in omittedViolations (count still includes them). The migration plan comes as migrationPlanSummary, and a result over its size budget is cut (truncated: true).",
        [ADVERTISED_DESCRIPTION]:
          "Optional repo-relative source files to inspect for impact diagnostics; scopes violations to what they touch.",
      },
      includeMigrationPlan: {
        type: "boolean",
        description:
          "Return the full migrationPlan (its actions, for kb_apply_plan) instead of migrationPlanSummary, which a check with sourceFiles always gives and any other check gives when the result is over its size budget.",
        [ADVERTISED_DESCRIPTION]:
          "Return the full migrationPlan (for kb_apply_plan) even when the result would show only its summary.",
      },
      offset: {
        type: "integer",
        minimum: 0,
        default: 0,
        description:
          "With rules: the first finding to list. A rule selection lists its findings in pages that keep to the size budget, and a cut page names the next offset.",
        [ADVERTISED_DESCRIPTION]:
          "With rules: the first finding to list; findings come in pages within the size budget.",
      },
      includeSymbolDebt: {
        type: "boolean",
        description:
          "Without rules or sourceFiles: list the unrecorded declarations per file under symbolDebt.files. By default symbolDebt carries only total and fileCount; the debt never blocks.",
        [ADVERTISED_DESCRIPTION]:
          "Without rules or sourceFiles: list unrecorded declarations per file (symbolDebt has counts only by default).",
      },
      staged: {
        type: "boolean",
        description:
          "When true, inspect staged source changes for impact diagnostics using the shared CLI impact analyzer without shelling out to kibi check.",
        [ADVERTISED_DESCRIPTION]:
          "When true, inspect staged source changes for impact diagnostics, as kibi check --staged does.",
      },
      changed: {
        type: "boolean",
        description:
          'When true, run the commit gate (kibi check --staged) over the working tree plus the index, as a commit of every current change would be judged, without touching the real index; with sourceFiles, only those files and .kb are added. Returns commitAllowed and the gate\'s findings, each with blocks: "commit" when it refuses the commit or "none" when it is advice. Without changed, each finding carries blocks: "merge" (fails the full check run in CI), "commit" (a blocking impact diagnostic) or "none". Use after editing code, before finishing: it is the verdict git commit will give.',
        [ADVERTISED_DESCRIPTION]:
          "When true, give the commit gate's verdict on every current change (commitAllowed, findings with blocks).",
      },
      includeWorkingTreeDiff: {
        type: "boolean",
        description:
          "When true, inspect current unstaged working-tree diffs for impact diagnostics. Pair with sourceFiles to scope the analysis.",
        [ADVERTISED_DESCRIPTION]:
          "When true, inspect unstaged working-tree diffs for impact diagnostics; pair with sourceFiles to scope.",
      },
      includeImpactDiagnostics: {
        type: "boolean",
        description:
          "When true, include changed-file impact diagnostics such as symbol_granularity_violation, symbol_semantic_review_needed, source_file_unowned and requirement_statement_unverified (each current requirement the changed code implements, with its statement and firmness, since the check never compares code with a statement) in structured output.",
        [ADVERTISED_DESCRIPTION]:
          "When true, include changed-file impact diagnostics (granularity, ownership, statements to verify) in the output.",
      },
      maxDiagnostics: {
        type: "integer",
        minimum: 0,
        description:
          "Optional maximum number of impact diagnostics to return. Graph validation violations are not capped by this value.",
      },
      workspaceRoot: {
        type: "string",
        description:
          "Optional workspace root for impact diagnostics. Defaults to the MCP server workspace.",
      },
      async: {
        type: "boolean",
        default: false,
        description:
          "When true, start the check as a background job and return a kibi.job.v1 receipt immediately instead of holding the request until the tool timeout. Poll kb_job_status with the returned jobId. Use for full checks on large KBs that exceed the configured tool timeout. The MCP server registers kb_job_status only when KIBI_MCP_OPTIONAL_TOOLS includes it; otherwise async runs the check synchronously.",
        [ADVERTISED_DESCRIPTION]:
          "When true, run as a background job and return a kibi.job.v1 receipt to poll with kb_job_status.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read", "workspace-read"],
  execute: executeCheck,
} as const satisfies OperationSpec;
