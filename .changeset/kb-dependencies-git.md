---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
---

A project can now read the KB of another repository it depends on, such as a library or a service it calls. Declare the repository and a tag, branch or commit in `.kb/dependencies.json`, pin it with `kibi deps lock`, and reads named with `kb` (MCP) or `--kb` (CLI) answer from that repository's own KB at the pinned commit. The dependency's KB is a read-only copy in a shared cache outside the repository: it never mixes with the project's KB, never slows its own checks, and can stay on an older KB schema (6 or later) until its owners upgrade.

- New `kibi deps lock [names...]` (with `--update`), `kibi deps fetch` and `kibi deps status`. The lock file `.kb/dependencies.lock.json` records each commit and its KB schema; `status` exits 1 when a dependency needs locking.
- `kb_search`, `kb_query`, `kb_status`, `kb_find_gaps`, `kb_coverage` and `kb_graph` accept an optional `kb` argument; the CLI commands `search`, `query`, `status`, `find-gaps`, `coverage` and `graph` accept `--kb <name>`, and their `--input` JSON routes accept `kb`.
- Over MCP, a dependency read runs in its own routed child server, so the attached project's server and store are untouched. Write tools take no `kb` argument, so a dependency is never written.
- The cache lives in `KIBI_DEPENDENCY_CACHE`, else `$XDG_CACHE_HOME/kibi/dependencies`, else `~/.cache/kibi/dependencies`.
- `kibi sync --quiet` no longer prints the symbol-coordinate refresh line.
