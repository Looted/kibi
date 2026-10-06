const PREREQUISITE_REASONS = {
  mcp_bundle_failed: "required_mcp_startup:bundle_failed",
  missing_bwrap: "missing_isolation:bwrap",
  missing_codex_executable: "missing_isolation:codex_executable",
  missing_claude_executable: "missing_isolation:claude_executable",
  missing_code_mode_host: "missing_isolation:code_mode_host",
  missing_node_executable: "missing_isolation:node_executable",
  sandbox_probe_failed: "isolation_probe_failed",
  source_isolation_probe_failed: "source_isolation_probe_failed",
} as const;

export type RuntimePrerequisiteKind = keyof typeof PREREQUISITE_REASONS;

export class RuntimePrerequisiteError extends Error {
  readonly name = "RuntimePrerequisiteError";

  constructor(readonly kind: RuntimePrerequisiteKind) {
    super(PREREQUISITE_REASONS[kind]);
  }
}

export class RequiredMcpStartupError extends Error {
  readonly name = "RequiredMcpStartupError";

  constructor(
    readonly detail: string,
    options?: ErrorOptions,
  ) {
    super(`required_mcp_startup:${detail}`, options);
  }
}
