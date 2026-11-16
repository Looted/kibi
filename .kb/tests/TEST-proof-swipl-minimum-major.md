---
title: The minimum SWI-Prolog major version shall be 9, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-swipl-minimum-major
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-prolog-swipl-minimum-swipl-major-src
  proves:
    - CLAIM-FFF27D6BB2C61251
origin:
  kind: agent
  recorded_at: '2026-10-28T10:35:25.456Z'
id: TEST-proof-swipl-minimum-major
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a87291f278db8973bf60e388
    test_id: TEST-proof-swipl-minimum-major
    scope: unit
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:26:12.883Z'
    finished_at: '2026-11-16T12:26:22.509Z'
    artifact_digest: a8485fb3a9f4975edc1d689f24b65393f33e073909733f7cbb46233beb4bee55
    contract_hash: 497bb053eb5cd2452525b366bab350c87a22ce070a6692d81c1d1b35c47151c7
    binding_hash: b92a0225b23b4e44c7d242ed6d50bb93237015a357b84b837cc84d480114ebed
    fingerprint: b1bb62dfca06dafa3915be9867914bfa0de960628a52e14acdd1ecf1273c44f6
    fingerprint_components:
      contract: 497bb053eb5cd2452525b366bab350c87a22ce070a6692d81c1d1b35c47151c7
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
      - symbol_id: SYM-proof-swipl-minimum-major
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-swipl-minimum-major
      variable: minimum_swipl_major
      value_type: int
      assumptions:
        - operator: eq
          value: 9
      claim:
        operator: eq
        value: 9
    certificate_digest: 02015ca509003f54c5b1fddaadfa235ccaa228f2a93d1ab2b423aa3ecf20a79e
    claim_bindings:
      - claim_key: CLAIM-FFF27D6BB2C61251
        requirement_id: REQ-prolog-swipl-minimum-version
        fact_id: FACT-swipl-minimum-major
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 9
          value_type: int
          variable: minimum_swipl_major
---
Proves that the minimum SWI-Prolog major version shall be 9, against the code Kibi reads at ingest.