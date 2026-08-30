---
id: TEST-kibi-telemetry-remediation-evidence
title: Packed correlated telemetry remediation tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/tests/TEST-kibi-telemetry-remediation-evidence.md
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - telemetry
  - diagnostics
  - remediation
  - cli
  - mcp
  - packed
  - e2e
links:
  - type: validates
    target: SCEN-kibi-telemetry-remediation-evidence
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-telemetry-remediation
      target: default
  success_policy: all_required_first_attempt
type: test
---

Exercises correlated diagnostic records and `kibi.telemetry-remediation.v1` through freshly packed CLI and MCP binaries. The test proves semantic logging parity, hard correlation when both session/actor identifiers are present, exact event references, deterministic repair order, explicit report-level evidence gaps, and read-only command behavior.
