---
"kibi-cli": minor
---

Every CLI operation route now supports `--schema` to print its JSON input contract, including the seven commands that also have their own flags (`query`, `search`, `status`, `find-gaps`, `coverage`, `graph`, and `check`). Validation errors on those routes now include the same `kibi <cmd> --schema` hint as JSON-only routes, so agents and scripts can inspect allowed fields without guessing. Every CLI command that accepts `--format json` now also accepts `--json` as a shorthand alias; `--json` together with a different explicit `--format` is rejected instead of one flag silently winning.

- Added `--schema` to `query`, `search`, `status`, `find-gaps`, `coverage`, `graph`, and `check`, printing each operation's `businessInputSchema` without requiring positional arguments or opening the KB.
- Removed the `INTEGRATED_OPERATIONS` exclusion in `cli-protocol.ts` so `VALIDATION_FAILED` always points at `kibi <cmd> --schema`.
- Added `--json` as an alias for `--format json` across all CLI commands whose `--format` supports JSON (`migrate`, `query`, `search`, `status`, `find-gaps`, `signoff`, `coverage`, `graph`, `check`, `deps lock|fetch|status`, `engine janitor`, `doctor`, `usage-metrics`, `usage-remediation`, `telemetry`, and `skills list|load|read|validate`), while omitting it on `init --print-hook --format`.
