/** Builds the host-local route to the canonical kibi-bootstrap skill. */
// implements REQ-KIBI-BOOTSTRAP-PLAN
export function buildKibiBootstrapAlias(): string {
  const lines = [
    "# /kibi-bootstrap",
    "",
    "Bootstrap Kibi knowledge for an existing repository.",
    "",
    "## Route",
    "If Kibi infrastructure is missing, run `kibi init` first.",
    "Then invoke the canonical `kibi-bootstrap` skill. OpenCode may expose this route as a native command or as `/kibi:kibi-bootstrap:mcp`; use whichever host syntax is available.",
  ];

  return lines.join("\n");
}
