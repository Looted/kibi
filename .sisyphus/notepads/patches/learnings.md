## [2026-02-18 00:00] Fix MCP Check String Mismatch
- Modified: packages/mcp/src/tools/check.ts
- Changed: "0 violations found (KB is valid)" → "No violations found"
- Result: MCP check test now passes (8/8)

Notes:
- Kept change minimal and localized to summary formatting.
- Ran lsp_diagnostics on changed file — no diagnostics.
- Ran `bun test packages/mcp/tests/tools/check.test.ts` — all tests passed.
