import type {
  PROOF_KINDS,
  ProofKind,
} from "../../../src/public/proof-protocol.js";

// implements REQ-kibi-code-proof-kinds

/**
 * The evidence level each proof kind supports. The type checker rejects this
 * file when PROOF_KINDS gains a member that is not listed here, so the map
 * covers every kind by construction.
 */
export const PROOF_KIND_LEVELS = {
  e2e: "tested",
  example: "tested",
  property: "tested",
  exhaustive: "proved",
  typecheck: "proved",
  arithmetic: "proved",
  smt: "proved",
} as const satisfies Record<(typeof PROOF_KINDS)[number], "proved" | "tested">;

export function proofKindLevel(kind: ProofKind): "proved" | "tested" {
  switch (kind) {
    case "e2e":
    case "example":
    case "property":
      return "tested";
    case "exhaustive":
    case "typecheck":
    case "arithmetic":
    case "smt":
      return "proved";
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}
