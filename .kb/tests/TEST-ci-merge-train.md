---
title: The merge train admits, lands and splits trains by their checks
status: passing
priority: should
tags:
  - ci
  - proof
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ci-merge-train
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T11:40:05.754Z'
id: TEST-ci-merge-train
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-175b23dd2093f9fa9ca45079
    test_id: TEST-ci-merge-train
    scope: end_to_end
    outcome: passed
    code_snapshot: 0f050cbe5870ad404a536978db155d1ce767ded0e8d8586205d977ebbc387805
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-18T15:15:21.267Z'
    finished_at: '2026-11-18T15:15:27.042Z'
    artifact_digest: 8c29606e3a2e77482f63024f68e56cabe5a9cb89bd8d826c04278dbf23244e5f
    contract_hash: a5bb3f83bfa0c5037d72ea174ab2224fbee26f9c08a7d8b1decf49f5ad9f87e2
    binding_hash: 2aafd88d2b363eefeebf6a3ca5dfa6b7623a1c9323635f0ebde22407d9cf77c1
    fingerprint: e32f20162bbb1688f7482c937afca832269393985d27707a33652c9308b28ad6
    fingerprint_components:
      contract: a5bb3f83bfa0c5037d72ea174ab2224fbee26f9c08a7d8b1decf49f5ad9f87e2
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
      - symbol_id: SYM-test-ci-merge-train
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks the planner's decisions as data (admission, landing only on the assembled head and base, re-running once, halving, ejecting only a lone pull request that failed twice, reassembly after a move) and runs whole steps against real git repositories and an in-memory GitHub: assembly with the merge driver, ejection on a conflict, a failed check or a sync that rewrites files, landing with develop getting the proven tree, and the split of a failed train. Reads merge-train.yml and the action.