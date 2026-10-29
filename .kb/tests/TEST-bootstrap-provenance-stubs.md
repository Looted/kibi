---
title: Bootstrap provenance stub tests
status: active
tags:
  - bootstrap
  - provenance-stubs
  - search
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: onboarding evaluation round 9 finding K18'
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
    receipt_id: PR-f73d86d899eb18e259c4e117
    test_id: TEST-bootstrap-provenance-stubs
    scope: end_to_end
    outcome: passed
    code_snapshot: a30c5405eea70e799be9d7e6691afbc947056c9986ccf1b9c9ee8c2f836b8849
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:53:47.265Z'
    finished_at: '2026-10-29T16:53:49.765Z'
    artifact_digest: 5253da181552862522e6389d1aeef8f59b51f4ab109aa52b4421bc791fe876a8
    contract_hash: 9f9dd2c314a8deb6fc2e5d1c4ebe39e4cc57e44ffe5d17040af66f6e8c09a7c9
    binding_hash: e1ccbd62e6761a42cd479fae838c7c417a8ee899b78bd85cbf99187aaf8997a3
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