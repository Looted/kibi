---
id: ADR-001
title: Dual-publish support for npm and bun runtimes
status: approved
created_at: 2026-02-25T09:57:06Z
updated_at: 2026-02-25T09:57:06Z
source: .github/workflows/ci.yml and packages/*/package.json
tags:
  - architecture
  - publishing
  - runtime-compatibility
---

## Context

Kibi was originally developed to run exclusively on Bun runtime, with TypeScript source files executed directly. To support npm publishing and Node.js runtime compatibility, several changes were made to enable dual-publish.

## Decision

**Decision**: Enable dual-publish support for both npm and Bun registries/runtimes.

**Rationale**: 
- Expand user base from Bun-only to both npm and Node.js ecosystems
- Enable traditional npm package publishing workflow with compiled JavaScript output
- Maintain backward compatibility with existing Bun development workflow
- Ensure published packages work correctly when installed via npm on Node.js runtime

## Implications

### Publishing Workflow
- Packages are no longer marked `"private": true` in package.json
- Build scripts compile TypeScript to JavaScript before publishing
- `prepublishOnly` hook ensures `tsc` runs automatically on `npm publish`
- `files` field explicitly controls which files are included in published packages

### Runtime Compatibility
- Bin shebangs changed from `#!/usr/bin/env bun` to `#!/usr/bin/env node` for Node.js compatibility
- Bun can execute Node.js binaries via `#!/usr/bin/env node` (respects the shebang)
- Both runtimes can execute the compiled binaries

### Dependency Management
- MCP package depends on `kibi-cli: ^0.1.0` (exact version) instead of `workspace:*`
- This ensures published MCP package has a concrete dependency on kibi-cli package

### Asset Bundling
- Prolog schema files (entities.pl, relationships.pl, validation.pl) bundled into `packages/cli/schema/` directory
- `kibi init` command now uses bundled schema files instead of monorepo-relative paths
- Published packages are self-contained and don't rely on monorepo layout

### CI/CD Integration
- Build step added before tests in CI workflow
- Ensures compiled artifacts exist before running tests
- Validates both runtime compatibility

## Alternatives Considered

1. **Monorepo publishing tool**: Use a tool like `lerna` or `pnpm` workspaces with version management
2. **Bundler**: Use `esbuild` or `tsup` for smaller, optimized bundles
3. **Single package**: Keep monorepo structure but publish as a unified package

## Consequences

### Positive
- Users can install kibi via npm on Node.js projects
- Bun users continue to use development workflow with `bun run bin/...`
- Published packages are independent of monorepo layout
- Clear separation of concerns between packages

### Negative
- Increased package size due to including both source and compiled output in published packages
- More complex build pipeline to maintain (compile, test, publish)
- Need to coordinate releases across two package managers (npm and bun)

## Status

**Accepted**: 2026-02-25
**Review Date**: 2026-04-25
**Reviewer**: TBD
