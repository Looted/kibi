---
id: TEST-cli-requirement-quality-diagnostics
title: CLI requirement quality diagnostic tests
status: passing
source: packages/cli/tests/traceability/impact-requirement-quality.test.ts
links:
  - type: validates
    target: SCEN-audit-quality-diagnostics-v1
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-requirement-quality-diagnostics
      target: default
  success_policy: all_required_first_attempt
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
tags:
  - review:context-missing
---

Validates broad requirement, requirement-status, and strict-fact modeling review diagnostics.
