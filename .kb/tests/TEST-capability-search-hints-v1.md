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
    receipt_id: PR-373460b2b245aa6c58327189
    test_id: TEST-capability-search-hints-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 5e3e6eaa548bff9c0a598b4fe638f7c58e1ead8cf4e2e8a298d11268b5058af3
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T19:24:38.123Z'
    finished_at: '2026-10-29T19:24:38.187Z'
    artifact_digest: aa9823c8487c047efd2abc178c3ff4f25eac2f7de2f8f2014bfa34afa6b3e75f
    contract_hash: 6c91ee3654ecc5005f27eecf788e608ccf1b53d827070166296aabf9fd253e10
    binding_hash: 876bd4303950a8eb60551414a605989cf17b76c769c691a9cd94d1640fa5bb2b
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
