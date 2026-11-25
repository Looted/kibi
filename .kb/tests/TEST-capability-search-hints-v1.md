---
title: kibi.search-hints.v1 capability and result validation tests
status: passing
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
    receipt_id: PR-5c9e1d3e096011648a5c7c7e
    test_id: TEST-capability-search-hints-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 6e77aa8491803349200bf000f91038c8e3ce1969155ba14cb5bad5a774bd6c1e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T20:06:49.968Z'
    finished_at: '2026-11-25T20:06:50.081Z'
    artifact_digest: 48cd6608c0d0831568d1f95b4199f6ac0769a997c6afae01a9fdce3be1a2bb35
    contract_hash: 6c91ee3654ecc5005f27eecf788e608ccf1b53d827070166296aabf9fd253e10
    binding_hash: 9819d8badb62057788cffc1fcc6fc17113a2e2e031e97b6853a4ec2f2dbdabc7
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
