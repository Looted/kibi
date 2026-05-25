---
"kibi-mcp": patch
---

MCP server startup now detects when a running process was launched from a stale installation path and automatically re-resolves the current project-local package. This prevents the module-not-found errors that could occur after upgrading kibi-mcp when a package manager, editor, or launcher had cached an old resolved path. The packed upgrade regression now runs reliably in CI by checking out the source fixtures it needs and hydrating legacy pnpm fixture dependencies before the offline current-package upgrade. Users can inspect startup resolution at any time with `--print-resolution` and enable debug diagnostics via `KIBI_MCP_DEBUG=1`.

- Added startup-resolution module with stale-vs-current path comparison
- Added `--print-resolution` flag to kibi-mcp for diagnostic startup path inspection
- Added `KIBI_MCP_DEBUG=1` env var support for resolution diagnostics on stderr
- Added project-local re-entry when stale running package is detected
- Added clean-package-tarballs script for packed artifact hygiene
- Fixed packed e2e CI source checkout for MCP upgrade and tarball verification jobs
- Fixed pnpm packed upgrade regression setup so legacy fixture dependencies are available before offline current-package upgrade
