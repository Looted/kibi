---
title: Resolver, package metadata, and launch environment controls
status: active
verification_scope: end_to_end
verification_perspective: internal
tags:
  - prolog
  - bundle
  - review:context-missing
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-bundled-runtime
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-runtime
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1694112a2ac15a7956b4e45a
    test_id: TEST-prolog-bundled-runtime
    scope: end_to_end
    outcome: passed
    code_snapshot: 48cc5f2c6340fb17a7d99816b8c9a340c61bcad65b834285c14663cdc1f2d7fa
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:22:50.227Z'
    finished_at: '2026-10-28T19:22:59.808Z'
    artifact_digest: 5eebd1badfc9cd3a08aebb5f1f0effb07e887210d85e8bacfd5d6c848a598dab
    contract_hash: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
    binding_hash: 970430601f6efe027571130d762f9a4d2230f5e44499458c7f02390e4b10e53b
    fingerprint: 624776195c4301e4cf1a3285b2aa0b7a02619f1e28fa8b9075ffe7751f3b650f
    fingerprint_components:
      contract: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
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
      - symbol_id: SYM-test-prolog-bundled-runtime
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
