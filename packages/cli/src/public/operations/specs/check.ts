import { executeCheck } from "../check-executor.js";
import type { OperationSpec } from "../types.js";
import {
  SELECTABLE_RULES_ALLOWED,
  SELECTABLE_RULE_NAMES,
} from "./check-rules.generated.js";
import { ADVERTISED_DESCRIPTION } from "../advertised-schema.js";

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
        },
        description: `Optional rule subset. Allowed: ${SELECTABLE_RULES_ALLOWED}. If omitted, server runs canonical and advisory rules plus the full-KB qualityDiagnostics audit scan, including usage telemetry acceptance when evidence exists; migration rules run only when explicitly selected. Advisory and migration findings are non-blocking qualityDiagnostics. If supplied, server preserves scoped validation and skips the full-KB advisory scan.`,
        [ADVERTISED_DESCRIPTION]:
          "Optional rule subset. Omit to run every canonical and advisory rule plus the full-KB audit; selected rules stay scoped.",
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
          "With sourceFiles: return the full migrationPlan (its actions, for kb_apply_plan) instead of migrationPlanSummary.",
      },
      staged: {
        type: "boolean",
        description:
          "When true, inspect staged source changes for impact diagnostics using the shared CLI impact analyzer without shelling out to kibi check.",
        [ADVERTISED_DESCRIPTION]:
          "When true, inspect staged source changes for impact diagnostics, as kibi check --staged does.",
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
