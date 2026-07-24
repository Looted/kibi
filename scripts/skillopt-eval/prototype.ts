// implements REQ-skill-behavioral-efficacy
export const REQUIRED_PROTOTYPE_CALLS = [
  "kb_search",
  "kb_query",
  "kb_check",
] as const;

// implements REQ-skill-behavioral-efficacy
export type PrototypeCall = (typeof REQUIRED_PROTOTYPE_CALLS)[number];
// implements REQ-skill-behavioral-efficacy
export type PrototypeFinalState = "expected" | "wrong";
// implements REQ-skill-behavioral-efficacy
export type PrototypeFailure =
  | "final_state_mismatch"
  | "missing_required_call"
  | "private_manifest_access";

// implements REQ-skill-behavioral-efficacy
export type PrototypeScenario = Readonly<{
  id: string;
  finalState: PrototypeFinalState;
  mcpCalls: readonly string[];
  privateManifestAccess: boolean;
}>;

// implements REQ-skill-behavioral-efficacy
export type PrototypeReceipt = Readonly<{
  id: string;
  hard: boolean;
  soft: number;
  criticalFailure?: PrototypeFailure;
}>;

function missingRequiredCall(calls: readonly string[]): boolean {
  return REQUIRED_PROTOTYPE_CALLS.some(
    (requiredCall) => !calls.includes(requiredCall),
  );
}

// implements REQ-skill-behavioral-efficacy
export function runPrototype(scenario: PrototypeScenario): PrototypeReceipt {
  if (scenario.privateManifestAccess) {
    return {
      id: scenario.id,
      hard: false,
      soft: 0,
      criticalFailure: "private_manifest_access",
    };
  }
  if (scenario.finalState !== "expected") {
    return {
      id: scenario.id,
      hard: false,
      soft: 0,
      criticalFailure: "final_state_mismatch",
    };
  }
  if (missingRequiredCall(scenario.mcpCalls)) {
    return {
      id: scenario.id,
      hard: false,
      soft: 0,
      criticalFailure: "missing_required_call",
    };
  }
  return { id: scenario.id, hard: true, soft: 1 };
}
