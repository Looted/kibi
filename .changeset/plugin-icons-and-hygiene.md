---
"kibi-claude": patch
"kibi-codex": minor
"kibi-cursor": patch
"kibi-mcp": patch
"kibi-opencode": patch
"kibi-vibe": patch
"kibi-zcode": patch
---

Kibi's harness plugins now display the Kibi icon consistently across Claude Code, Cursor, Codex, and light- or dark-theme MCP clients. The Claude Code npm package now includes its bundled slash commands (`commands/kibi-signoff.md`), and the Codex plugin migrates to the forward-looking root `plugin.json` (Agent Plugins 1.0) format with OpenAI `interface` metadata and starter prompts.

Technical summary:
- `kibi-claude`: bundled `assets/logo.png`, added `icon` and `displayName` to `.claude-plugin/plugin.json` (removing the unsupported `icon` field from the `kibi-claude` entry in `.claude-plugin/marketplace.json`), and added `assets` and `commands` to `package.json` `files`.
- `kibi-codex`: migrated `.codex-plugin/plugin.json` to root `plugin.json` (`agent-plugins.org` 1.0.0 schema with `extensions["com.openai"]`), bundled `assets/logo.png` and `assets/composer-icon.svg`, and added `interface` presentation metadata (`displayName`, `shortDescription`, `defaultPrompt`, `brandColor`).
- `kibi-cursor`: bundled `assets/logo.svg`, declared `logo` in `.cursor-plugin/plugin.json`, included `assets` and `LICENSE` in package outputs, and synced `plugins/kibi-cursor`.
- `kibi-mcp`: removed `theme: "dark"` from `KIBI_ICONS` so MCP clients render the icon on both light and dark backgrounds.
- `kibi-zcode`, `kibi-vibe`, `kibi-opencode`: added `LICENSE` to package payloads, standardized `homepage` URLs to `https://looted.github.io/kibi/`, removed the stray nested `packages/opencode/.changeset/` file, and added an icon drift test (`scripts/tests/plugin-icons-drift.test.ts`).
