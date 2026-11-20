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
    receipt_id: PR-5c008d6dae51fd0ca244d760
    test_id: TEST-skillopt-file-bridge-unit
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
