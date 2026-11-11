---
title: The semantic text pin code shall be semantic_text_pin, by a regex proof
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
    - symbol_id: SYM-proof-semantic-text-pin-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-semantic-text-pin-code
  proves:
    - CLAIM-A8F6A8E66D766038
origin:
  kind: agent
  recorded_at: '2026-10-28T20:30:15.552Z'
id: TEST-proof-semantic-text-pin-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a1a0f6c71c4ae2514f586fac
    test_id: TEST-proof-semantic-text-pin-code
    scope: unit
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:30:37.790Z'
    finished_at: '2026-11-04T18:30:37.927Z'
    artifact_digest: 4439309c06a17641829b3d8b9c3e7e2641b2e0607d840222e6f66638f025025e
    contract_hash: 19d25d0d7baf49ec5f827973824a07bdce96a9a61a60089e9e514018ba617674
    binding_hash: 2e982a1c5b431c36a7f23e6360124c3df04600c788c8e069d584a7f3f7cb1b49
    fingerprint: c704c736e09153384caa667e042bf59769977e155fb79d64d428f71203f4cdf1
    fingerprint_components:
      contract: 19d25d0d7baf49ec5f827973824a07bdce96a9a61a60089e9e514018ba617674
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
      - symbol_id: SYM-proof-semantic-text-pin-code
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
      test_id: TEST-proof-semantic-text-pin-code
      pattern:
        symbol_id: SYM-const-semantic-text-pin-code
        type: string
        value: semantic_text_pin
    certificate_digest: 4684bdce41904fddd600d9322d1b9da42d2c4e7da90f8ce478643503efd573ed
    claim_bindings:
      - claim_key: CLAIM-A8F6A8E66D766038
        requirement_id: REQ-cli-migration-context-codes
        fact_id: FACT-semantic-text-pin-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: semantic_text_pin
---
Proves that the semantic text pin code shall be semantic_text_pin, against the code Kibi reads at ingest.