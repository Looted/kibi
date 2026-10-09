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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2f20e23530e5c0806869b097
    test_id: TEST-bootstrap-provenance-stubs
    scope: end_to_end
    outcome: passed
    code_snapshot: ef462154276e18a22fc27d7e05cb5710d76da971a9db3fecf51033784cb2c51b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-09T07:25:54.498Z'
    finished_at: '2026-10-09T07:25:56.141Z'
    artifact_digest: 535be6d2252d97c2f2f8d6ab8f8b33a454729b98980827426067e076f8322d81
    contract_hash: 9f9dd2c314a8deb6fc2e5d1c4ebe39e4cc57e44ffe5d17040af66f6e8c09a7c9
    binding_hash: 8e91d143f36ee3323bf5ed88c0a30924e41d2e785e743138cd6274abc149ad5f
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
---
Runs the bootstrap provenance stub suite, which plans provider candidates with and without a claim and checks the meta fact kind, the bootstrap:provenance-stub tag, the selection lane, the over_limit accounting and the plan summary, and the search provenance stub suite, which checks that a stub sorts last in intent and legacy ranking, is dropped under the default threshold and never appears in the answer layer notes. The Prolog discovery_provenance_stubs unit checks that find_gaps and type coverage skip the stub.