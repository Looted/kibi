---
title: The supersede explanation heading shall be Why this changed, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-why-this-changed-heading
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-decision-firmness-why-heading
  proves:
    - CLAIM-B6471B91793A326B
origin:
  kind: agent
  recorded_at: '2026-10-28T10:33:43.876Z'
id: TEST-proof-why-this-changed-heading
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a8cc5cf56b2cfc2fe6838d35
    test_id: TEST-proof-why-this-changed-heading
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 98bbafe46f9f2b72e816b509c2728a47ff3144ef015352ac251743471f3c151a
    binding_hash: ee59794f8734f54393c3c8dbdae309d3f54e898f8adc16d406d17c644002a079
    fingerprint: 82c0dcf8fc409b3ab6d3dabb82290d3a87aea43ab301292d1c7ae35baa6748de
    fingerprint_components:
      contract: 98bbafe46f9f2b72e816b509c2728a47ff3144ef015352ac251743471f3c151a
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
      - symbol_id: SYM-proof-why-this-changed-heading
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-why-this-changed-heading
      pattern:
        symbol_id: SYM-decision-firmness-why-heading
        type: string
        value: Why this changed
    certificate_digest: 02fa9beb54f378090c0ae50074fe8324a2a75be5fb2b38d248b3657f4590796e
    claim_bindings:
      - claim_key: CLAIM-B6471B91793A326B
        requirement_id: REQ-kb-decision-firmness-settings
        fact_id: FACT-why-this-changed-heading
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: Why this changed
---
Proves that the supersede explanation heading shall be Why this changed, against the code Kibi reads at ingest.