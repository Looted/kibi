---
title: kibi.search-hints.v1 capability and result validation tests
status: active
tags:
  - search
  - plugins
priority: should
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-capability-search-hints-v1
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-29T19:18:49.374Z'
id: TEST-capability-search-hints-v1
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0c40e47d9b9c22ea68baf860
    test_id: TEST-capability-search-hints-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 2a2bc0148aadb7465b0951667921f43fb62104d824bfdbede98a1846632f8f6e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T21:35:02.611Z'
    finished_at: '2026-10-29T21:35:02.681Z'
    artifact_digest: 515c56f0b3d38ea63443d0b721ecea2025aae6bc63f8c412f91c31b5c70daab5
    contract_hash: 6c91ee3654ecc5005f27eecf788e608ccf1b53d827070166296aabf9fd253e10
    binding_hash: 0397db75aaac54b60b0cf6186ffade592406bcf6618d7df65609c1355e771230
    fingerprint: 4f89b49f81156cfcefc564af051e770a912e1e514356aceb5ae131feabb75f11
    fingerprint_components:
      contract: 6c91ee3654ecc5005f27eecf788e608ccf1b53d827070166296aabf9fd253e10
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
      - symbol_id: SYM-test-capability-search-hints-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Plugin SDK tests that validate search hints plugins and results: a plugin without an id, model or hint function is rejected, results naming unknown or repeated ids, exceeding the limit, scoring out of range or out of order are rejected, and augment mode for the capability is rejected in project configuration.
