---
id: REQ-audit-quality-diagnostics-v1
title: Kibi checks surface advisory audit quality diagnostics separately from hard violations
status: open
created_at: 2026-07-01T00:00:00Z
updated_at: 2026-07-01T00:00:00Z
source: docs/cli-reference.md
priority: must
tags: [auditability, diagnostics, traceability]
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
---

Kibi check surfaces must keep objectively invalid graph/schema/strict-fact states in the hard `violations[]` lane while surfacing heuristic modeling-quality signals in non-blocking `qualityDiagnostics[]`.

Quality diagnostics must be visible automatically through existing CLI, MCP, coverage, staged-check, and OpenCode scheduled-check paths so agents are prompted to update granular requirements, symbols, facts, and tests without needing a separate audit command.
