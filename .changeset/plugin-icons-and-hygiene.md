---
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-mcp": patch
"kibi-opencode": patch
"kibi-vibe": patch
"kibi-vscode": minor
"kibi-zcode": patch
---

Kibi's harness plugins now display the Kibi icon consistently across Claude Code, Cursor, Codex, and light- or dark-theme MCP clients. The Claude Code npm package now includes its bundled slash commands (`commands/kibi-signoff.md`), the Codex plugin adds `interface` metadata and starter prompts in `.codex-plugin/plugin.json`, and the VS Code extension now registers the Kibi MCP server through VS Code's `mcpServerDefinitionProviders` API instead of an unsupported static `contributes.mcp` block.

Technical summary:
- `kibi-claude`: bundled `assets/logo.png`, added `icon` and `displayName` to `.claude-plugin/plugin.json` (removing the unsupported `icon` field from the `kibi-claude` entry in `.claude-plugin/marketplace.json`), and added `assets` and `commands` to `package.json` `files`.
- `kibi-codex`: kept `.codex-plugin/plugin.json` (so Codex continues loading `.mcp.json` and `hooks/hooks.json`), bundled `assets/logo.png` and `assets/composer-icon.svg`, and added `interface` presentation metadata (`displayName`, `shortDescription`, `defaultPrompt`, `brandColor`).
- `kibi-cursor`: bundled `assets/logo.svg`, declared `logo` in `.cursor-plugin/plugin.json`, included `assets` and `LICENSE` in package outputs, and synced `plugins/kibi-cursor`.
- `kibi-mcp`: removed `theme: "dark"` from `KIBI_ICONS` so MCP clients render the icon on both light and dark backgrounds.
- `kibi-vscode`: replaced the non-functional static `contributes.mcp.servers` block with `contributes.mcpServerDefinitionProviders` and `vscode.lm.registerMcpServerDefinitionProvider` (workspace-gated on `.kb/manifest.json`, passing `KIBI_MCP_ATTACH_ROOT`, resolving `kibi.mcp.serverPath` → project-local `node_modules/.bin/kibi-mcp` → PATH, and degrading gracefully on older VS Code hosts).
- `kibi-zcode`, `kibi-vibe`, `kibi-opencode`: added `LICENSE` to package payloads, standardized marketplace `homepage` URLs to `https://looted.github.io/kibi/`, removed the stray nested `packages/opencode/.changeset/` file, and added an icon drift test (`scripts/tests/plugin-icons-drift.test.ts`).
