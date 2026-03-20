---
id: FACT-009
title: GitHub Actions workflow handles npm publishing
status: active
created_at: 2026-02-25T15:50:00Z
updated_at: 2026-03-20T00:00:00Z
source: documentation/facts/FACT-009.md
tags:
  - deployment
  - github-actions
  - npm
  - ci-cd
---

The GitHub Actions workflow `.github/workflows/publish.yml` automates npm package publishing:

Workflow steps:
1. Checkout code
2. Install SWI-Prolog (dependency)
3. Setup Bun for install/build/test
4. Setup Node.js with npm registry access
5. Install dependencies with `bun install`
6. Build packages with `bun run build`
7. Run tests with `bun test`
8. Publish release-managed packages (`kibi-core`, `kibi-cli`, `kibi-mcp`, `kibi-opencode`) to npm when their versions are not already present on the registry

The workflow uses npm for publishing (not bun) to ensure compatibility with npm registry requirements. Published packages use the `--provenance --access public` flags for package integrity.
