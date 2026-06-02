---
"kibi-codex": minor
---

Codex users can now install an optional Kibi adapter package for bundled Kibi skills, MCP configuration, and warning-only lifecycle hooks. This gives teams a managed Codex entry point while keeping `kibi-core`, `kibi-cli`, and `kibi-mcp` as the foundation for project-local Kibi operations. Teams that do not use the plugin can continue to configure Codex manually against the local `kibi-mcp` command.

- Add the publishable `kibi-codex` package with Codex plugin manifest assets, bundled skills, hook declarations, and MCP config.
- Add a conservative hook runner with bounded dirty-path state and advisory-only setup/freshness messages.
- Wire `kibi-codex` into workspace build, pack, release-state, publish, CI unit coverage, docs, and local marketplace verification.
