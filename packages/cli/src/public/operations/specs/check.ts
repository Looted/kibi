import { executeCheck } from "../check-executor.js";
import type { OperationSpec } from "../types.js";

export const checkSpec = {
  name: "kb_check",
  cliName: "check",
  description:
    "Run KB validation rules and return violations. Use before or after mutations, and after meaningful source edits with impact options to surface symbol granularity and semantic-review diagnostics. Do not use for point lookups. No write side effects. Prefer explicit rules for faster iteration; omit rules for final full validation plus full-KB qualityDiagnostics review, including telemetry acceptance when .kb/usage.log exists.",
  businessInputSchema: {
    type: "object",
    properties: {
      rules: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "must-priority-coverage",
            "symbol-coverage",
            "symbol-traceability",
            "no-dangling-refs",
            "no-cycles",
            "required-fields",
            "deprecated-adr-no-successor",
            "domain-contradictions",
            "strict-fact-shape",
            "strict-req-fact-pairing",
            "predicate-verifiability",
            "logic-coverage",
            "rule-safety",
            "rule-verifiability",
            "semantic-completeness",
            "query-plan-safety",
          ],
        },
        description:
          "Optional rule subset. Allowed: must-priority-coverage, symbol-coverage, symbol-traceability, no-dangling-refs, no-cycles, required-fields, deprecated-adr-no-successor, domain-contradictions, strict-fact-shape, strict-req-fact-pairing, predicate-verifiability, logic-coverage, rule-safety, rule-verifiability, semantic-completeness, query-plan-safety. If omitted, server runs all rules plus the full-KB qualityDiagnostics audit scan, including usage telemetry acceptance when evidence exists; if supplied, server preserves scoped validation and skips the full-KB advisory scan.",
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
          "Optional workspace root for impact diagnostics and .kb/config.json lookup. Defaults to the MCP server workspace.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read", "workspace-read"],
  execute: executeCheck,
} as const satisfies OperationSpec;
