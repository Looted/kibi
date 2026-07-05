---
id: SCEN-audit-quality-diagnostics-v1
title: Kibi surfaces advisory audit diagnostics without changing hard validation semantics
status: active
links:
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

# Audit Quality Diagnostics

## Given
- A KB contains broad, weakly covered, or coarse-grained modeling evidence.
- The graph/schema state may still be valid.

## When
- Existing Kibi check surfaces run through CLI, MCP, coverage reporting, staged checks, or OpenCode scheduled checks.

## Then
- Hard `violations[]` continue to control failure status.
- Advisory `qualityDiagnostics[]` are shown with severity, blocking state, evidence, and repair suggestions.
- Review/info diagnostics do not fail checks by default.
