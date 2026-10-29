---
title: 'The Kibi carbon brand colour shall be #1d1e23, by a regex proof'
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
    - symbol_id: SYM-proof-brand-carbon-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.carbon
  proves:
    - CLAIM-8C7E4BA35F56F1A5
origin:
  kind: agent
  recorded_at: '2026-10-28T22:28:10.167Z'
id: TEST-proof-brand-carbon-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f5f6f8fa7afc17370a7ae9f3
    test_id: TEST-proof-brand-carbon-color
    scope: unit
    outcome: passed
    code_snapshot: 0a46a168f79f32c7067fd54b62e7bfea277eb1d3f88ddceab97c98613f8e5f74
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:32:23.240Z'
    finished_at: '2026-10-28T22:32:23.335Z'
    artifact_digest: e88f531779a79b177b132a1c305a58faa4cc596c007e671d1eaa289d5ee23ec2
    contract_hash: 4b5a98c8670f62d849976ac11d0648851717ff855ddccd2ded072e3044ef39d6
    binding_hash: d5182e181df1efa901d022b3996a1e2c3550c3997686a785aebf9930180b9775
    fingerprint: a236aa639d064e05be3f8fa7c7cb07a2b2b7ab034c790396a042dbc736b8abfc
    fingerprint_components:
      contract: 4b5a98c8670f62d849976ac11d0648851717ff855ddccd2ded072e3044ef39d6
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
      - symbol_id: SYM-proof-brand-carbon-color
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
      test_id: TEST-proof-brand-carbon-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#1d1e23'
    certificate_digest: 367beafcd608602ff83cda60255873e83b3653e2b770d052fa40414171e90e0c
    claim_bindings:
      - claim_key: CLAIM-8C7E4BA35F56F1A5
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-carbon-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#1d1e23'
---
Proves that the Kibi carbon brand colour shall be #1d1e23, against the code Kibi reads at ingest.