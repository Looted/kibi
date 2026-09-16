// implements REQ-kibi-proof-evidence-protocol
export type ProofRunOutcome =
  | "passed"
  | "failed"
  | "errored"
  | "cancelled"
  | "timed_out"
  | "interrupted"
  | "no_results";

export type ProofResultOutcome =
  | "passed"
  | "failed"
  | "timed_out"
  | "skipped"
  | "interrupted"
  | "errored";

export type ProofBindingKind = "native_case" | "aggregate_run";
export type AttemptsStatus = "complete" | "unavailable";
export type RunFailurePhase =
  | "setup"
  | "collection"
  | "execution"
  | "teardown"
  | "infrastructure";
export type SuccessPolicy = "all_required_first_attempt";

export type ProofAttempt = Readonly<{
  outcome: ProofResultOutcome;
  duration_ms?: number;
}>;

export type ProofAttempts = Readonly<
  | { status: "complete"; entries: readonly ProofAttempt[] }
  | { status: "unavailable" }
>;

export type ProofResult = Readonly<{
  symbol_id: string;
  target: string;
  outcome: ProofResultOutcome;
  binding: ProofBindingKind;
  native_id?: string;
  attempts: ProofAttempts;
  diagnostics?: readonly string[];
}>;

export type ProducerProvenance = Readonly<{
  name: string;
  version?: string;
}>;

export type ProofEnvironment = Readonly<Record<string, unknown>>;

export type ProofRun = Readonly<{
  outcome: ProofRunOutcome;
  exit_code: number;
  started_at: string;
  finished_at: string;
  failure_phase?: RunFailurePhase;
}>;

export type ProofRunArtifact = Readonly<{
  version: "kibi.proof-run.v1";
  producer: ProducerProvenance;
  executor?: ProducerProvenance;
  command_argv: readonly string[];
  code_snapshot: string;
  environment: ProofEnvironment;
  run: ProofRun;
  proof_results: readonly ProofResult[];
  integration?: string;
  diagnostics?: readonly string[];
}>;

export type ProofObligation = Readonly<{
  symbol_id: string;
  target: string;
}>;

export type ProofContract = Readonly<{
  version: "kibi.proof-contract.v1";
  integration: string;
  required_proofs: readonly ProofObligation[];
  success_policy: SuccessPolicy;
}>;

export type ProofBinding = Readonly<{
  symbol_id: string;
  target: string;
  native_id?: string;
  aliases?: readonly string[];
  source_file?: string;
  line?: number;
}>;
