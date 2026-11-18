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
    receipt_id: PR-92970f2c7f049adcd0b40ee4
    test_id: TEST-ci-merge-train
    scope: end_to_end
    outcome: passed
    code_snapshot: 4e9465f7ff222e5b0fb45d12add9c6e7084bf0ebe61bad5b2dac484fc376e5be
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-18T14:19:48.348Z'
    finished_at: '2026-11-18T14:19:54.023Z'
    artifact_digest: e5d63c39538f33af3aede2c20dc9211793e02409bbb3fc1e2ff4f6b42084c5ca
    contract_hash: a5bb3f83bfa0c5037d72ea174ab2224fbee26f9c08a7d8b1decf49f5ad9f87e2
    binding_hash: 55d3d6105d56c4042e77e57029caf3b57303be7a171530f058bc9c04b1268c5c
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