---
title: Bootstrap provenance stub tests
status: passing
tags:
  - bootstrap
  - provenance-stubs
  - search
priority: must
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-09: onboarding evaluation round 9 finding K18'
  recorded_at: '2026-10-09T07:21:39.749Z'
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-bootstrap-provenance-stubs
      target: default
    - symbol_id: SYM-test-search-provenance-stubs
      target: default
  success_policy: all_required_first_attempt
id: TEST-bootstrap-provenance-stubs
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d4f32f328ca171405bdebd35
    test_id: TEST-bootstrap-provenance-stubs
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 9f9dd2c314a8deb6fc2e5d1c4ebe39e4cc57e44ffe5d17040af66f6e8c09a7c9
    binding_hash: 95afd164e97cec12d8bad8f8b94cafd90ae43bea3c69d55edadc67bcd395d35e
    fingerprint: b8db6ba306b1225219ce8528bbb31841b73c01c8de769765a76ebb5c056bb840
    fingerprint_components:
      contract: 9f9dd2c314a8deb6fc2e5d1c4ebe39e4cc57e44ffe5d17040af66f6e8c09a7c9
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
      - symbol_id: SYM-test-bootstrap-provenance-stubs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-search-provenance-stubs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the bootstrap provenance stub suite, which plans provider candidates with and without a claim and checks the meta fact kind, the bootstrap:provenance-stub tag, the selection lane, the over_limit accounting and the plan summary, and the search provenance stub suite, which checks that a stub sorts last in intent and legacy ranking, is dropped under the default threshold and never appears in the answer layer notes. The Prolog discovery_provenance_stubs unit checks that find_gaps and type coverage skip the stub.