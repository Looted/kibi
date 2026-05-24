---
"kibi-cli": minor
---

Kibi now includes a `usage-metrics` command so operators can inspect how the knowledge base is actually being used and where quality signals are degrading. This makes it easier to spot missing telemetry, frequent zero-result lookups, and recurring validation trouble before those issues turn into blind spots for people or agents. The command reads `.kb/usage.log` and reports the main adoption and remediation indicators in either human-readable table output or JSON.

- **kibi-cli**: Added `kibi usage-metrics` with `--format json|table` and `--limit <n>` support for usage-log quality reporting.
