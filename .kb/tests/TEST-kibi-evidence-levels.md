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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a6186a6cbde34b2aea36ae6d
    test_id: TEST-kibi-evidence-levels
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 488df5f639d46a89f3e4fffe171918d89f7482589ce48d839846d7c35581bd43
    binding_hash: b6622c536caebcfecb237c865760102a65077c31b5745c3fe2b122fb1fd8dcfa
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
    kind: e2e
    evidence_level: tested
---
Runs the installed packed CLI on a sandbox repository and checks the evidence levels end to end: kibi coverage rows carry the v4 proof version, an evidence level and its evidence entries, the hand-written requirement reads as asserted, the summary counts rows per level, the tested status filter works while proven is rejected, and the HTML report and kibi signoff show the level.