---
title: Packed runtime engine daemon consumer proof
status: passing
tags:
  - runtime
  - engine
  - packed
  - e2e
  - proof
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-runtime-engine-daemon
      target: default
  success_policy: all_required_first_attempt
id: TEST-runtime-packed-engine-daemon
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b07047595b8c4ed541c8dbb7
    test_id: TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: ec8538cede0c497fbd808316e461fbd35bbfa5bd13aca63444a8eb8affe6c8a3
    binding_hash: a4413cbb3ba64a5de0584f72c559fcc58163cf8343a7303343ab7ad0f4a4ce37
    fingerprint: 76e8e28be0080a3523df987dfd0fd913a3938502845df485e52a8ca7b04e3b6a
    fingerprint_components:
      contract: ec8538cede0c497fbd808316e461fbd35bbfa5bd13aca63444a8eb8affe6c8a3
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
      - symbol_id: SYM-test-runtime-engine-daemon
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 7): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
This installs published tarballs into a clean prefix and starts the engine client from the installed runtime. It proves daemon resolution without a nested `kibi-cli`.
