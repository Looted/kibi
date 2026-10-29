---
title: Packed vocabulary-convergence checks and subject reuse
status: passing
verification_scope: end_to_end
tags:
  - vocabulary-convergence
  - review:context-missing
id: TEST-kibi-vocabulary-convergence-e2e
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-vocabulary-convergence
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-af42ea209defa3f95ad78f4b
    test_id: TEST-kibi-vocabulary-convergence-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: 4015792e45e163c9ef221115c30a79374921664a5f8d7ef4db0f94d2f35e6043
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:56:21.773Z'
    finished_at: '2026-10-29T16:58:08.955Z'
    artifact_digest: 60569bc7bba50216a64f410803e1d56ceb96b49f6c1e64218c9df34dd0de22ed
    contract_hash: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
    binding_hash: 6d7aae1df03d463916a4726a10f977f0f24f18feb1e56c35be50ce4c0f126921
    fingerprint: 5406c2fad7d914cb86444da8bc034d4c12e354df557edb73a53714eb5e3a287a
    fingerprint_components:
      contract: 38388f8b6f77547335812590975f70eecc5e7b53c48d8adfe6378fdf1f7ac13e
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
      - symbol_id: SYM-test-packed-vocabulary-convergence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
