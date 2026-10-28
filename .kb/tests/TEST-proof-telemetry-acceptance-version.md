---
title: The telemetry acceptance version shall be kibi.telemetry-acceptance.v1, by a regex proof
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
    - symbol_id: SYM-proof-telemetry-acceptance-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-reqcompiler-telemetry-acceptance-version
  proves:
    - CLAIM-461C66C6CB3D0930
origin:
  kind: agent
  recorded_at: '2026-10-28T20:52:23.994Z'
id: TEST-proof-telemetry-acceptance-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f3a1f54af7b63cf0c8fced27
    test_id: TEST-proof-telemetry-acceptance-version
    scope: unit
    outcome: passed
    code_snapshot: 25d6f9f7c94412ebd022bf7299d1f96ef3ecdaebd005b4d852c619957f6bd1ad
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:54:40.614Z'
    finished_at: '2026-10-28T20:54:40.751Z'
    artifact_digest: d77efd12017760f47be9797a11d99fc8561d4b87eef7c1b2a5c83911276557a0
    contract_hash: f8fa89de80ff21e3480dc17bd6ba055970a4afacd881c8ad2c6cbaf887e5cf6e
    binding_hash: 5b4dd7359ae48b508fb576ee426256b0b439d955886c893bf7ef15a6cf086789
    fingerprint: 215246c941887f8a447d724854bf578b6147369c077f208cfda2fc9f09358da0
    fingerprint_components:
      contract: f8fa89de80ff21e3480dc17bd6ba055970a4afacd881c8ad2c6cbaf887e5cf6e
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
      - symbol_id: SYM-proof-telemetry-acceptance-version
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
      test_id: TEST-proof-telemetry-acceptance-version
      pattern:
        symbol_id: SYM-reqcompiler-telemetry-acceptance-version
        type: string
        value: kibi.telemetry-acceptance.v1
    certificate_digest: 0517ca805aaca5cef2440da13d9d802eedbece293226ce22a3bed790145fa980
    claim_bindings:
      - claim_key: CLAIM-461C66C6CB3D0930
        requirement_id: REQ-kibi-telemetry-versions
        fact_id: FACT-telemetry-acceptance-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.telemetry-acceptance.v1
---
Proves that the telemetry acceptance version shall be kibi.telemetry-acceptance.v1, against the code Kibi reads at ingest.