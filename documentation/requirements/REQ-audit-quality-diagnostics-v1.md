---
id: REQ-audit-quality-diagnostics-v1
title: Kibi checks surface advisory audit quality diagnostics separately from hard violations
status: open
created_at: 2026-07-01T00:00:00.000Z
updated_at: 2026-07-01T00:00:00.000Z
source: docs/cli-reference.md
priority: must
tags:
  - auditability
  - diagnostics
  - traceability
links:
  - type: specified_by
    target: SCEN-audit-quality-diagnostics-v1
  - type: verified_by
    target: TEST-audit-quality-diagnostics-v1
  - type: verified_by
    target: TEST-cli-quality-diagnostics-contract
  - type: verified_by
    target: TEST-mcp-quality-diagnostics-contract
  - type: verified_by
    target: TEST-cli-symbol-quality-diagnostics
  - type: verified_by
    target: TEST-cli-mixed-purpose-diagnostics
  - type: verified_by
    target: TEST-cli-requirement-quality-diagnostics
  - type: verified_by
    target: TEST-opencode-advisory-diagnostics
  - type: verified_by
    target: TEST-coverage-depth-labels
semantic_text: Kibi check surfaces must keep objectively invalid graph/schema/strict-fact states in the hard `violations[]` lane while surfacing heuristic modeling-quality signals in non-blocking `qualityDiagnostics[]`. Quality diagnostics must be visible automatically through existing CLI, MCP, coverage, staged-check, and OpenCode scheduled-check paths so agents are prompted to update granular requirements, symbols, facts, and tests without needing a separate audit command.
semantic_clauses:
  - Kibi check surfaces must keep objectively invalid graph/schema/strict-fact states in the hard `violations[]` lane while surfacing heuristic modeling-quality signals in non-blocking `qualityDiagnostics[]`.
  - Quality diagnostics must be visible automatically through existing CLI, MCP, coverage, staged-check, and OpenCode scheduled-check paths so agents are prompted to update granular requirements, symbols, facts, and tests without needing a separate audit command.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 07e3d1f0af1afee358f1ac8eeb08424dcd92f1adf81def39d28c2d490f0995a7
logic_claims:
  - CLAIM-527EA2A164A47E49
  - CLAIM-B5AE6C2844A5E3A2
semantic_inventory:
  - claim_key: CLAIM-527EA2A164A47E49
    claim_text: Kibi check surfaces must keep objectively invalid graph/schema/strict-fact states in the hard `violations[]` lane while surfacing heuristic modeling-quality signals in non-blocking `qualityDiagnostics[]`
    role: normative
    status: modeled
    span:
      start: 0
      end: 203
    payload_hash: 308df8fc609bc1b3d2b3e02d4ebd4e2d1b783854fc4d0e603a7e92e1b2d9273a
    reason: Grounded through the advisor-selected strict fact or approved project-local predicate schema.
  - claim_key: CLAIM-B5AE6C2844A5E3A2
    claim_text: Quality diagnostics must be visible automatically through existing CLI, MCP, coverage, staged-check, and OpenCode scheduled-check paths so agents are prompted to update granular requirements, symbols, facts, and tests without needing a separate audit command
    role: normative
    status: modeled
    span:
      start: 205
      end: 463
    payload_hash: 308df8fc609bc1b3d2b3e02d4ebd4e2d1b783854fc4d0e603a7e92e1b2d9273a
    reason: Grounded through the advisor-selected strict fact or approved project-local predicate schema.
type: req
---

Kibi check surfaces must keep objectively invalid graph/schema/strict-fact states in the hard `violations[]` lane while surfacing heuristic modeling-quality signals in non-blocking `qualityDiagnostics[]`.

Quality diagnostics must be visible automatically through existing CLI, MCP, coverage, staged-check, and OpenCode scheduled-check paths so agents are prompted to update granular requirements, symbols, facts, and tests without needing a separate audit command.
