---
title: SkillOpt scoring gates unit contract
status: passing
tags:
  - skillopt
  - unit
  - structural-contract
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-skillopt-scoring-gates-unit
      target: default
  success_policy: all_required_first_attempt
id: TEST-skillopt-scoring-gates-unit
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 7): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b9499ac4ba89407714748975
    test_id: TEST-skillopt-scoring-gates-unit
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d2b7b50e29b7b7c885efb534b4e522f5e296617cda497de79d9cf7b232652857
    binding_hash: 38b2d6bf5a4d5537d5a4c4d3a4c98b3dabab54d1a01433a96adb3a12b195e187
    fingerprint: 68a026e727dd6be85f1045f9b35a0071c2eb2258f5cee4764453f0f0e0a18a06
    fingerprint_components:
      contract: d2b7b50e29b7b7c885efb534b4e522f5e296617cda497de79d9cf7b232652857
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-unit-test-skillopt-scoring-gates-unit
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---

## Context
Paid-run telemetry showed every training trajectory failing on direct KB access, so the gate rejected every proposal. These tests lock in the fixes to MCP item scanning and interim outcomes. Source: commit "stop trust-plane and closeout defects pinning train rollouts to hard=0".
