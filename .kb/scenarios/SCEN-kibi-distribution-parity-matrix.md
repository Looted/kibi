---
id: SCEN-kibi-distribution-parity-matrix
title: Compare requirement-compiler semantics across actual runtime resolutions
status: active
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/scenarios/SCEN-kibi-distribution-parity-matrix.md
tags: [parity, distribution, dogfood, packed, cli, mcp, e2e]
links:
  - type: verified_by
    target: TEST-kibi-distribution-parity-matrix
---

Given source, freshly packed, and project-resolved CLI/MCP binaries, when the canonical requirement-compiler fixtures run in isolated workspaces, then current source and packed outcomes match exactly, matching dogfood outcomes remain explicit, and older unsupported package capabilities remain non-matches with named upgrade actions. Given drift, unresolved provenance, execution failure, or a project divergence without a repair action, the matrix fails closed with a stable issue code.
