---
id: ADR-discovery-tools-public-surface
title: Discovery tools expand the public read surface without exposing raw inference
status: proposed
created_at: 2026-03-22T00:00:00Z
updated_at: 2026-03-22T18:30:00Z
source: docs/superpowers/specs/2026-03-22-discovery-bundle-design.md
tags:
  - mcp
  - cli
  - discovery
  - inference
---

# ADR: Discovery Tools Expand the Public Read Surface Without Exposing Raw Inference

## Decision

Kibi exposes curated discovery tools for search, status, gap analysis, coverage, and bounded graph traversal through MCP and CLI.

## Rationale

- Users need exploratory analysis without dropping to greps or raw KB internals.
- `kb_query` remains exact and deterministic.
- The product exposes answers, not unrestricted inference predicates.

## Consequences

- The public surface grows, but stays curated.
- Agent guidance must stop describing the surface by fixed tool count.
- Tests and docs must validate both MCP and CLI parity for discovery workflows.
