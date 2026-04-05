// implements REQ-opencode-smart-enforcement-v1, REQ-opencode-kibi-plugin-v1

import type { PathKind } from "./path-kind.js";

/**
 * Risk classification for file edits.
 * Ordered from safest to riskiest for consumer convenience.
 */
export type RiskClass =
  | "safe_docs_only"
  | "safe_test_only"
  | "kb_doc_structural"
  | "req_policy_candidate"
  | "behavior_candidate"
  | "traceability_candidate"
  | "manual_kb_edit";

/**
 * Input parameters for risk classification.
 * All fields are cheaply computable — no AST parsing or async required.
 * pathKind already encodes path-based classification from analyzePath().
 */
export interface ClassifyRiskParams {
  pathKind: PathKind;
  isUnderKb: boolean;
  hasMustPriority: boolean;
  hasDurableComment: boolean;
  fileContent: string;
}

/**
 * Result of risk classification with the determined class and human-readable reasons.
 */
export interface RiskClassification {
  riskClass: RiskClass;
  reasons: string[];
}

/**
 * Regex to detect exportable code constructs (functions, classes, variables).
 */
const BEHAVIOR_PATTERN =
  /(?:export\s+(?:function|class|const|let|var)|\bclass\s+\w+|\bfunction\s+\w+|\bdef\s+\w+)/;

/**
 * Regex to detect traceability annotations.
 */
const TRACEABILITY_PATTERN = /implements\s+REQ-[A-Za-z0-9_-]+/i;

/**
 * Classify a file edit into a deterministic risk class.
 *
 * Classification order (first match wins):
 * 1. manual_kb_edit        — file is under .kb/
 * 2. safe_test_only        — pathKind is "test"
 * 3. req_policy_candidate  — pathKind is "requirement"
 * 4. kb_doc_structural     — pathKind is "scenario", "adr", or "fact"
 * 5. safe_docs_only        — pathKind is "unknown" (markdown/config/etc.)
 * 6. traceability_candidate — code with exports AND (hasDurableComment OR missing traceability)
 * 7. behavior_candidate    — code with exports, already has traceability, no durable comment
 * 8. safe_docs_only        — code without exports, or fallback
 */
export function classifyRisk(params: ClassifyRiskParams): RiskClassification {
  const {
    pathKind,
    isUnderKb,
    hasMustPriority,
    hasDurableComment,
    fileContent,
  } = params;

  // 1. manual_kb_edit — direct KB manipulation is always risky
  if (isUnderKb) {
    return {
      riskClass: "manual_kb_edit",
      reasons: ["File is under .kb/ — manual edits bypass KB validation"],
    };
  }

  // 2. safe_test_only — test files are low-risk
  if (pathKind === "test") {
    return {
      riskClass: "safe_test_only",
      reasons: ["File is a test file — edits are low risk"],
    };
  }

  // 3. req_policy_candidate — requirement docs need policy checks
  if (pathKind === "requirement") {
    const reasons = [
      "File is a requirement document — policy checks recommended",
    ];
    if (hasMustPriority) {
      reasons.push(
        "Requirement has priority:must — elevated validation required",
      );
    }
    return {
      riskClass: "req_policy_candidate",
      reasons,
    };
  }

  // 4. kb_doc_structural — structural KB documentation
  if (
    pathKind === "scenario" ||
    pathKind === "adr" ||
    pathKind === "fact" ||
    pathKind === "flag" ||
    pathKind === "event" ||
    pathKind === "symbol"
  ) {
    return {
      riskClass: "kb_doc_structural",
      reasons: [
        "File is structural KB documentation — relationship and field validation recommended",
      ],
    };
  }

  // 5. safe_docs_only — non-code, non-kb-doc files (markdown, config, etc.)
  if (pathKind === "unknown") {
    return {
      riskClass: "safe_docs_only",
      reasons: ["File is not a code or KB document — low risk"],
    };
  }

  // pathKind === "code" from here on
  if (pathKind === "code") {
    const hasBehavior = BEHAVIOR_PATTERN.test(fileContent);
    const hasTraceability = TRACEABILITY_PATTERN.test(fileContent);

    if (hasBehavior) {
      // 6. traceability_candidate — needs traceability attention
      if (hasDurableComment || !hasTraceability) {
        const reasons: string[] = [];
        if (!hasTraceability) {
          reasons.push(
            "Code file contains exports without // implements REQ-xxx annotation",
          );
        }
        if (hasDurableComment) {
          reasons.push(
            "Durable knowledge comment detected — traceability review recommended",
          );
        }
        return {
          riskClass: "traceability_candidate",
          reasons,
        };
      }

      // 7. behavior_candidate — has exports and traceability, no durable comment
      return {
        riskClass: "behavior_candidate",
        reasons: [
          "Code file contains exportable constructs — discovery guidance applies",
        ],
      };
    }

    // Code file without export patterns — treat as safe
    return {
      riskClass: "safe_docs_only",
      reasons: ["Code file has no detected export patterns — low risk"],
    };
  }

  // Fallback — should not be reached since all PathKind values are handled
  return {
    riskClass: "safe_docs_only",
    reasons: ["File type is unhandled — defaulting to safe classification"],
  };
}
