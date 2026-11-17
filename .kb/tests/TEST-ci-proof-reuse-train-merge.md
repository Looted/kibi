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
    receipt_id: PR-6b9ebd6388c1f820ea94cb87
    test_id: TEST-ci-proof-reuse-train-merge
    scope: end_to_end
    outcome: passed
    code_snapshot: 67a7027804054d3e1ad5eba369af76262f95dee16081c641e17ca8ebb023ead5
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T11:50:32.590Z'
    finished_at: '2026-11-17T11:50:33.103Z'
    artifact_digest: 2e9ceeba9ba5b83ce4e4fc0191debf3a1ee9604d1d675682fe9ab9eae127d515
    contract_hash: 3aa3d7f2b18df7067fdd59cb2ae907931e7296096129560d39161e7aafaab86a
    binding_hash: 0818eb8df7d96a11e15c98b9fe78f443b99d8ca521d1d5486bd4ba4893c54a6b
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