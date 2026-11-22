---
title: SkillOpt file bridge unit contract
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
    - symbol_id: SYM-unit-test-skillopt-file-bridge-unit
      target: default
  success_policy: all_required_first_attempt
id: TEST-skillopt-file-bridge-unit
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 7): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-08391ab8999eba0e7219010a
    test_id: TEST-skillopt-file-bridge-unit
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: a3ab6955a4ac9144aff904ffadda95378d380b4ad86e7e0014f7775612189286
    binding_hash: 94d8cfad1522b63d5a230bf7b5c626832d3c0ed034e6b92a403eff2a36fccd5f
    fingerprint: 7ba2f1fe06d0be850cc72e50da39add7d92a43552d629ce9d22c6a7f84cd3130
    fingerprint_components:
      contract: a3ab6955a4ac9144aff904ffadda95378d380b4ad86e7e0014f7775612189286
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
      - symbol_id: SYM-unit-test-skillopt-file-bridge-unit
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
