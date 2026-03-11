---
id: FACT-008
title: npm packages published as kibi-core, kibi-cli, and kibi-mcp
status: active
created_at: 2026-02-25T15:50:00Z
updated_at: 2026-03-11T00:00:00Z
source: documentation/facts/FACT-008.md
tags:
  - deployment
  - npm
  - package-naming
---

Kibi packages are published to npm as unscoped names:
- Core package: `kibi-core` (Prolog modules and RDF graph logic)
- CLI package: `kibi-cli` (installs `kibi` command)
- MCP package: `kibi-mcp` (installs `kibi-mcp` command)

The `@kibi` scoped package name was unavailable on npm, so the packages were renamed to unscoped names. This change is reflected in:
- package.json `name` fields
- internal imports between packages
- README installation instructions

The VS Code extension (`kibi-vscode`) is published to the VS Code Marketplace, not npm. See ADR-013 for the complete package matrix and versioning model.
