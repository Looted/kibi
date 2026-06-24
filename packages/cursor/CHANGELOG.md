# kibi-cursor

## 0.2.2

### Patch Changes

- Kibi now gives agents clearer guidance for the diagnostics flow, so the release notes should reflect that the bundled usage text and MCP logging story were tightened together.

  This update also keeps the package mirrors aligned where applicable, which helps downstream plugin consumers stay in sync with the canonical guidance.

  - Hardened bundled skill guidance for kibi usage.
  - Improved MCP diagnostic logging shape and validation hints.
  - Synced packaged skill copies where they are shipped with the release.

## 0.2.1

### Patch Changes

- 5d2975a: Cursor stop hooks no longer inject a long multi-line Kibi freshness reminder after every agent response. Follow-ups are now one line, and most sessions stay silent.

  - Track `kb_upsert`, `kb_delete`, and `kb_check` MCP usage during the session.
  - Emit no stop follow-up when nothing KB-relevant changed, or when `kb_check` already ran after edits.
  - Emit a short summary (`Kibi KB updated (kb_upsert).`) after KB mutations, or a single-line sync nudge when source files changed without KB activity.
  - Fix publish workflow to build and pack `kibi-cursor` tarballs before npm publish.

- Cursor sessions now use Cursor's documented workspace root payload when deciding whether Kibi is already configured. This prevents the plugin from telling agents that Kibi needs bootstrapping just because the hook process is running from the plugin install directory instead of the actual workspace. The bootstrap reminder now names the missing `.kb/config.json` condition directly instead of implying MCP is unavailable.

  - Parse `workspace_roots` from Cursor hook payloads and prefer the first workspace root for Kibi config detection.
  - Add a regression test covering `sessionStart` without `cwd` when `workspace_roots` points at a configured workspace.
  - Reword the bootstrap reminder to describe a missing workspace config rather than generic initialization failure.

## 0.2.0

### Minor Changes

- Cursor users can now install an optional Kibi adapter plugin that bundles MCP configuration, workflow rules, skills, slash commands, and advisory editor hooks. The plugin builds on the existing `kibi-cli` and `kibi-mcp` foundation without replacing them, and teams that prefer manual setup can continue configuring the local `kibi-mcp` server directly.

  - Add the publishable `kibi-cursor` package with Cursor plugin manifest assets, rules, skills, commands, hook declarations, and MCP config.
  - Add advisory hooks for bootstrap reminders, direct `.kb` edit warnings, read/write guidance, and session freshness follow-ups.
  - Wire `kibi-cursor` into workspace build, pack, release-state, publish, CI unit coverage, docs, and marketplace verification.

## 0.1.0

### Minor Changes

- Cursor users can install an optional Kibi adapter plugin that bundles MCP configuration, workflow rules, skills, slash commands, and advisory editor hooks. The plugin builds on `kibi-core`, `kibi-cli`, and `kibi-mcp` without replacing them, and teams that prefer manual setup can continue configuring the local `kibi-mcp` server directly.

  - Add the publishable `kibi-cursor` package with Cursor plugin manifest assets, bundled skills, rules, commands, hook declarations, and MCP config.
  - Add a conservative hook runner with bounded session state, bootstrap reminders, direct `.kb` edit warnings, read/write guidance, and freshness follow-ups.
  - Wire `kibi-cursor` into workspace build, pack, release-state, publish, CI unit coverage, docs, and marketplace verification.
