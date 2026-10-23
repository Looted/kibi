---
title: Evidence levels through the packed CLI coverage, report and signoff
status: passing
tags:
  - proof
  - coverage
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-evidence-levels
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-23T12:08:50.486Z'
id: TEST-kibi-evidence-levels
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fbccad20d722fd8cc2b53d09
    test_id: TEST-kibi-evidence-levels
    scope: end_to_end
    outcome: passed
    code_snapshot: d32cd3f92a4c7483052a78e1ec727e390954d399a651ec6e883ff2e57d855ded
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-23T12:33:07.070Z'
    finished_at: '2026-10-23T12:35:08.062Z'
    artifact_digest: 04de51925090f156e527a96710e17b616a92fecfd17c5cb60c736993eb3f1695
    contract_hash: 488df5f639d46a89f3e4fffe171918d89f7482589ce48d839846d7c35581bd43
    binding_hash: 0560189fba2f4e198f4ce3fbe2c3b21028acc0a2e6b09f4db5fd2bc97a2f6ce0
    fingerprint: fe82656f72a9edf1f1d6c7da3730cb23d8ceb2e8a0c1e1bea53feb11b19daa13
    fingerprint_components:
      contract: 488df5f639d46a89f3e4fffe171918d89f7482589ce48d839846d7c35581bd43
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
      - symbol_id: SYM-e2e-packed-cli-evidence-levels
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs the installed packed CLI on a sandbox repository and checks the evidence levels end to end: kibi coverage rows carry the v4 proof version, an evidence level and its evidence entries, the hand-written requirement reads as asserted, the summary counts rows per level, the tested status filter works while proven is rejected, and the HTML report and kibi signoff show the level.