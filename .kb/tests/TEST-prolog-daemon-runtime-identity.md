---
title: Daemon handshake and replacement controls
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - prolog
  - bundle
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-daemon-runtime-identity
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-daemon-runtime-identity
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-218bd31b84e2ba3eb3d149e7
    test_id: TEST-prolog-daemon-runtime-identity
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
    binding_hash: f41c2568f7a37bb3024481532d6cc97ef226630a595ab50f0afc64ab91a4dc4e
    fingerprint: f7dee56c5f569ced9f4100db75e1bc6585a89a9e8063804985d8fcb39a5639ba
    fingerprint_components:
      contract: d72c4705059135438b1fc71972d0ba452be3c3c568faaf38e8d7bfbf56fff310
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
      - symbol_id: SYM-test-prolog-daemon-runtime-identity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 4): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This checks that the handshake carries the resolved binary and version, and that a mismatch replaces the daemon.
