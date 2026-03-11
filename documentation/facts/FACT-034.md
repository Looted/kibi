---
id: FACT-034
title: Kibi npm package matrix (core, cli, mcp)
status: active
created_at: 2026-03-11T12:15:00Z
updated_at: 2026-03-11T12:15:00Z
source: documentation/facts/FACT-034.md
tags:
  - npm
  - release
  - package-matrix
links:
  - ADR-013
  - ADR-014
---

# Fact: Kibi npm Package Matrix

Kibi is released as three npm packages:

| Package     | Directory         | npm Name    | Published To |
|-------------|-------------------|-------------|--------------|
| kibi-core   | packages/core/    | kibi-core   | npm          |
| kibi-cli    | packages/cli/     | kibi-cli    | npm          |
| kibi-mcp    | packages/mcp/     | kibi-mcp    | npm          |

- Each package maintains independent semantic versioning
- All releases are managed via Changesets workflows
- kibi-vscode is published separately to the VS Code Marketplace (not npm)

## Fallback Guidance
If KB query is unavailable or unreliable, consult this fact and ADR-013/ADR-014 for authoritative package and release policy.
