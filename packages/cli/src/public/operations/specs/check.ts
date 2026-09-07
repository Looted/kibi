import { executeCheck } from "../check-executor.js";
import type { OperationSpec } from "../types.js";
import {
  SELECTABLE_RULE_NAMES,
  SELECTABLE_RULES_ALLOWED,
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
        },
        description: `Optional rule subset. Allowed: ${SELECTABLE_RULES_ALLOWED}. If omitted, server runs canonical and advisory rules plus the full-KB qualityDiagnostics audit scan, including usage telemetry acceptance when evidence exists; migration rules run only when explicitly selected. Advisory and migration findings are non-blocking qualityDiagnostics. If supplied, server preserves scoped validation and skips the full-KB advisory scan.`,
      },
      sourceFiles: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional repo-relative source files to inspect for early impact diagnostics. Use with includeImpactDiagnostics after meaningful source edits.",
      },
      staged: {
        type: "boolean",
        description:
          "When true, inspect staged source changes for impact diagnostics using the shared CLI impact analyzer without shelling out to kibi check.",
      },
      includeWorkingTreeDiff: {
        type: "boolean",
        description:
          "When true, inspect current unstaged working-tree diffs for impact diagnostics. Pair with sourceFiles to scope the analysis.",
      },
      includeImpactDiagnostics: {
        type: "boolean",
        description:
          "When true, include changed-file impact diagnostics such as symbol_granularity_violation and symbol_semantic_review_needed in structured output.",
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
          "When true, start the check as a background job and return a kibi.job.v1 receipt immediately instead of holding the request until the tool timeout. Poll kb_job_status with the returned jobId. Use for full checks on large KBs that exceed the configured tool timeout.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read", "workspace-read"],
  execute: executeCheck,
} as const satisfies OperationSpec;
