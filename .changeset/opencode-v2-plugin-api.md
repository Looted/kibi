---
"kibi-opencode": minor
---

kibi-opencode now loads on OpenCode v2 as well as OpenCode v1. Before this change, OpenCode v2 refused the plugin with "Plugin must export a default definition with an id and an effect or setup function." (#509).

- The package default export is now a plugin definition object `{ id: "kibi-opencode", server, setup }`. OpenCode v1 (>= 1.4) calls `server` with the legacy input. OpenCode v2 calls `setup` with its domain `Context`.
- The v2 bridge rebuilds the legacy input from `ctx.location` and registers the existing hooks on v2 domains. System guidance goes through `session.hook("context")`. Tool telemetry and file lifecycle events go through `tool.hook("execute.after")`, with `file.*` events derived from `edit`, `write`, and `patch` calls. On OpenCode v2.0.32 the public event bus does not report workspace file changes (bash `rm`/`mv`, `git checkout`, an external editor), so those do not schedule a sync; use `kibi sync` or the git hooks from `kibi init`. The `/kibi-bootstrap` command goes through `command.transform`.
- If a v2 domain fails to register (or a registration fails to dispose), the plugin now reports it through its operational error log (`[kibi-opencode] OpenCode v2 <domain> registration failed`) instead of failing silently. The other domains keep working.
- The no-op `chat.params` hook is dropped on v2. OpenCode v2 offers plugins no toast or `client.app.log` transport, so on v2 the plugin falls back to its local logger and shows no toasts.
- The TUI entry (`kibi-opencode/tui`) now also exports `setup`, so the OpenCode v2 TUI no longer rejects it with "Invalid V2 TUI plugin module". OpenCode v1 keeps using `tui`.
- The package now ships root `index.js` and `tui.js` shims that re-export `dist/index.js` and `dist/tui.js`. A directory install does not read `package.json` exports, so without `tui.js` the TUI entry is dropped.
- Breaking for direct importers: `import plugin from "kibi-opencode"` no longer returns a callable function. Call `plugin.server(input)` instead. The package root still exports no functions, because legacy OpenCode loaders invoke every function export.
