---
"kibi-mcp": patch
---

Packed `kibi-mcp` tarballs could previously ship without `dist/server/session.js`, which made the MCP server fail on startup with `Cannot find module '.../dist/server/session.js'` and left every `kibi_kb_*` tool unusable. The packaging pipeline now rejects incomplete builds before they can be packed or released, so dogfood and consumer installs always receive a complete server bundle.

- Added a `dist/server/session.js` existence check to `scripts/verify-package-contract.mjs` so the `prepack` gate fails on stale or partial builds.
- Added `dist/server/session.js` to the required-entry assertions in the packed tarball regression test (`cli-verify-tarball-core.test.ts`).
- Made `kibi-mcp` build clean `dist/` before compiling (`clean` + `build` scripts) to prevent stale artifacts from surviving incremental compiles, matching the pattern already used by `opencode`, `codex`, `cursor`, and `vscode`.
