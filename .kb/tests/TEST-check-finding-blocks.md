---
title: Finding blocks tag tests
status: active
priority: must
verification_scope: integration
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-check-finding-blocks
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-finding-blocks
      target: default
  success_policy: all_required_first_attempt
---
Checks that every finding of the full check carries blocks merge or none, every staged and changed finding carries blocks commit or none, a finding that is blocking or has severity error stops its level, and the envelope's diagnostics leave the tag out.