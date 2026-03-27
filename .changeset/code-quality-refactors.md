---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-opencode": patch
---

Internal code quality improvements and refactoring.

- Deduplicate `splitTopLevel` into single canonical function in `codec.ts`.
- Deduplicate `Violation`, `ChecksConfig`, and rule definitions between CLI and MCP.
- Extract `safeCleanupProlog` helper to eliminate duplicated teardown patterns.
- Replace `process.exit()` with return values in CLI command handlers.
- Remove dead code (`target-resolver.ts`), annotate empty catch blocks, remove unreachable code paths.
- Add `toPrologString` helper, `parseViolationRows`, export `splitTopLevelGeneral` from codec.
- Clean narration comments across all packages.
