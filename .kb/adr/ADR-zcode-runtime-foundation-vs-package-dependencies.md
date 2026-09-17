---
title: Runtime foundation ownership is separate from npm package dependencies
status: accepted
tags:
  - architecture
  - zcode
  - dependencies
  - runtime
id: ADR-zcode-runtime-foundation-vs-package-dependencies
type: adr
---
# ADR: Runtime foundation ownership is separate from npm package dependencies

## Status

Accepted

## Context

kibi-zcode adapts ZCode to project-local Kibi. Project-local Kibi logic, command workflows, and MCP operations remain owned by kibi-core, kibi-cli, and kibi-mcp respectively (REQ-zcode-kibi-plugin-v1). An earlier draft of that requirement modeled the foundation as a direct npm dependency on kibi-core.

## Decision

Runtime core/cli/mcp ownership is separate from npm direct dependencies. kibi-zcode must not declare or invent a direct kibi-core dependency. Installing or enabling kibi-zcode must not modify core Kibi runtime components. Delegation to project-local kibi-core, kibi-cli, and kibi-mcp binaries and optional peer arrangements are acceptable; the adapter ships declarative plugin assets and advisory lifecycle hooks only, and the hard enforcement gate remains owned by the Kibi git hooks installed by kibi init (REQ-zcode-advisory-enforcement-boundary-v1).

## Consequences

- No install lifecycle mutations; the packed package contract enforces optionality.
- Foundation guarantees trace to the typed facts of REQ-zcode-kibi-plugin-v1, not to package dependencies.
- Advisory output and silence rules remain testable through the ZCode native proof cases.