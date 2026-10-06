---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-core": patch
"kibi-runtime": patch
"kibi-agent-core": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-opencode": patch
"kibi-plugin-builtin": patch
"kibi-plugin-sdk": patch
"kibi-plugin-jev": patch
"kibi-plugin-treesitter": patch
"kibi-swipl": patch
"kibi-swipl-linux-x64-gnu": patch
"kibi-swipl-linux-arm64-gnu": patch
"kibi-swipl-darwin-arm64": patch
"kibi-swipl-darwin-x64": patch
---

Every Kibi package page on npm now has a README that says what the package is for and how to install it, and links to the documentation site. Package metadata now points npm's "Homepage" link at the documentation site, its "Repository" link at the package's own folder on GitHub, and adds an "Issues" link.

Adds READMEs to `kibi-cli`, `kibi-mcp`, `kibi-core`, `kibi-runtime`, `kibi-agent-core`, `kibi-codex`, `kibi-plugin-builtin` and `kibi-plugin-sdk`. Sets `homepage` to https://looted.github.io/kibi/, adds `repository.directory` and `bugs` to every package, and refreshes the `kibi-plugin-treesitter` integrity manifest and source-analyzer approval for its changed `package.json`.
