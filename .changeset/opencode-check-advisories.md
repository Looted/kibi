---
"kibi-cli": minor
"kibi-opencode": minor
---

OpenCode background checks now surface advisory Kibi quality diagnostics without turning a clean check into an operational plugin failure. Users get concise structured maintenance logs for review-only findings while hard `kibi check` violations keep the existing failure behavior and exit status. The CLI check command also exposes a JSON format so background integrations can consume the same structured diagnostics reliably.

Technical summary:
- Add `kibi check --format json` output with `structuredContent.violations`, `count`, `diagnostics`, and `qualityDiagnostics`.
- Run OpenCode targeted background checks with JSON output and parse non-blocking `qualityDiagnostics` on successful checks.
- Log advisory diagnostic summaries through structured warning logs, preserving terminal silence and existing hard check failure routing.
