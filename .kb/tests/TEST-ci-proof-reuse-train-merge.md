---
title: A develop push reuses the merged train's proof only for the train's files
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
    - symbol_id: SYM-test-ci-proof-reuse-train-merge
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T11:50:13.649Z'
id: TEST-ci-proof-reuse-train-merge
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-88c4b9ea172cecafb8b0d00e
    test_id: TEST-ci-proof-reuse-train-merge
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 3aa3d7f2b18df7067fdd59cb2ae907931e7296096129560d39161e7aafaab86a
    binding_hash: 8bb1f265ef4028cd09337dda522423b0c29358002903b8b3f5162e07d622a381
    fingerprint: 4ce0ce915e17aed7f68ce75b29917dfce5b10ad4df28a886caef76e563567db0
    fingerprint_components:
      contract: 3aa3d7f2b18df7067fdd59cb2ae907931e7296096129560d39161e7aafaab86a
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
      - symbol_id: SYM-test-ci-proof-reuse-train-merge
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs ci-proof-reuse.ts against real git repositories and a fake gh: a merge train pull request run attests its head and base, a develop push that merges the train reuses its proof and records which run it came from, and the push runs the full proof when the commit is not a train merge, no unique successful train run exists, the run's provenance or attestation does not match, or the snapshots differ.