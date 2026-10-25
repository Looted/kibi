---
title: SkillOpt scoring gates unit contract
status: passing
tags:
  - skillopt
  - unit
  - structural-contract
  - review:context-missing
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
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ab6753d83fdf785faa6b4136
    test_id: TEST-skillopt-scoring-gates-unit
    scope: unit
    outcome: passed
    code_snapshot: cffe41b11590abbf5935d229d1c33d882718eab1b065285a913e2254bd9e5828
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:36:33.577Z'
    finished_at: '2026-10-25T12:36:33.698Z'
    artifact_digest: 6b337fdf1de16179f468f5908b7ec77d0da41d7aa722fa1745da37b694745c07
    contract_hash: d2b7b50e29b7b7c885efb534b4e522f5e296617cda497de79d9cf7b232652857
    binding_hash: e70354b5078d1e9f9466f739f9660f2c3fa933b134ba9750361969d07df0d7a6
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
