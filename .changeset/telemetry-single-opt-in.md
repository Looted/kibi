---
"kibi-cli": patch
---

One switch now turns on usage telemetry everywhere. Until now, the CLI ignored `KIBI_DIAGNOSTIC_MODE` and only listened to its own `KIBI_CLI_DIAGNOSTIC_MODE`. An operator who opted in for the MCP server therefore still recorded nothing from agents that call Kibi through the CLI. CLI rows also lacked the host, version, and checkout fields that MCP rows carry, so the two surfaces could not be compared.

- Honor `KIBI_DIAGNOSTIC_MODE` (`1` or `true`) in the CLI JSON routes; keep `KIBI_CLI_DIAGNOSTIC_MODE` as the older spelling.
- Stamp `host`, `package_version`, and `workspace_root` on CLI usage rows; `host` comes from `KIBI_HOST`/`KIBI_MCP_HOST` or a Claude Code shell, else `unknown`.
- Skip `interface: "hook"` rows in `parseTelemetryUsageLog`, so acceptance, `usage-metrics`, and `usage-remediation` only see Kibi operations.
- Strip the telemetry opt-in from sandboxed test CLIs unless a test sets it explicitly.
