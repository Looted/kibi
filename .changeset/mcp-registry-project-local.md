---
"kibi-mcp": patch
---

Directories that mirror the official MCP Registry will advertise the project-local start command for kibi-mcp after the next registry publish. Install `kibi-core`, `kibi-cli`, and `kibi-mcp` as dev dependencies in the repository, then start the server that is already installed there. A global `npx -y kibi-mcp` downloads a separate copy and does not attach to that repository's knowledge base.

The registry manifest sets `runtimeHint` to `npx` and a positional `runtimeArguments` value of `--no-install`, which the server.json schema passes to the runtime rather than to the server binary. The description notes that the package must be installed as a project dev dependency. Version sync still rewrites only the manifest version fields.
