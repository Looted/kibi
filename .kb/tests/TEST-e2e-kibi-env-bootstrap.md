---
title: 'Packed e2e: harness-independent Kibi env bootstrap'
status: passing
tags:
  - env
  - bootstrap
  - e2e
  - packed
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-cli-env-bootstrap
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-kibi-env-bootstrap
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-716b6f9e93c3e89ef8005ee4
    test_id: TEST-e2e-kibi-env-bootstrap
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
    binding_hash: 227f57f5c33ab87861c1eb3e30e36a8f73962fc9eb41e7afb4ca95fc90ad7832
    fingerprint: 0198b39d269adeff69b33565bdd87ed13c070b419af33dae60353fec72740b9f
    fingerprint_components:
      contract: 0ba436dcf300b4492505e0d09b08f6861460148d0158f7af7de5ff1897706cb4
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
      - symbol_id: SYM-e2e-cli-env-bootstrap
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
# TEST-e2e-kibi-env-bootstrap

Packed consumer e2e for harness-independent env bootstrap: process wins over project `.env.kibi`, blank values stay unset (user wins), and `KIBI_WORKSPACE` overrides cwd for workspace resolution via `kibi-runtime`.
