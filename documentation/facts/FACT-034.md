---
id: FACT-034
title: Kibi npm package matrix (core, cli, mcp, opencode)
status: active
created_at: 2026-03-11T12:15:00Z
updated_at: 2026-03-20T00:00:00Z
source: documentation/facts/FACT-034.md
tags:
  - npm
  - release
  - package-matrix
links:
  - ADR-013
  - ADR-014
  - FACT-POL-027
---

# Fact: Kibi npm Package Matrix

Kibi is released as four npm packages:

| Package     | Directory         | npm Name    | Published To |
|-------------|-------------------|-------------|--------------|
| kibi-core   | packages/core/    | kibi-core   | npm          |
| kibi-cli    | packages/cli/     | kibi-cli    | npm          |
| kibi-mcp    | packages/mcp/     | kibi-mcp    | npm          |
| kibi-opencode | packages/opencode/ | kibi-opencode | npm       |

- Each package maintains independent semantic versioning
- All releases are managed via Changesets workflows
- kibi-vscode is published separately to the VS Code Marketplace (not npm)
- This repository's OpenCode workflow dogfoods local `kibi-mcp` and `kibi-opencode` builds; see FACT-POL-027

## Fallback Guidance
If KB query is unavailable or unreliable, consult this fact and ADR-013/ADR-014 for authoritative package and release policy.
