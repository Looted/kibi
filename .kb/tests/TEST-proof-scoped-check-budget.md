---
title: The scoped kb_check output budget shall be 24,000 characters, by an arithmetic proof
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
    - symbol_id: SYM-proof-scoped-check-budget
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-scoped-check-budget-chars
  proves:
    - CLAIM-5DD822300CD53C9C
origin:
  kind: agent
  recorded_at: '2026-11-16T11:01:42.802Z'
id: TEST-proof-scoped-check-budget
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e0c31e5a1fc2f63001a4dbf8
    test_id: TEST-proof-scoped-check-budget
    scope: unit
    outcome: passed
    code_snapshot: 5434da306c269b06f3ab3332686aeca47fd3a0e8a998befaf06388d5c53900c8
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:16:19.002Z'
    finished_at: '2026-11-16T12:16:20.147Z'
    artifact_digest: e17216bcddd843b4b018df121c8dc8c97f5b4b7e2a236f65acacb56b4cd3d5ef
    contract_hash: 6b1df691661e7cb954ddebfd0289bba23aeb796c2b55f405e3da6df2d06fe4e4
    binding_hash: c8ceec6b25796ea98c255488dd9bda949dcfdc9a654ffed364fc55e0f0046793
    fingerprint: 3d1511816a4ded16ed59677c8ced00a2ae18f1f82944f331496a0aac994ed350
    fingerprint_components:
      contract: 6b1df691661e7cb954ddebfd0289bba23aeb796c2b55f405e3da6df2d06fe4e4
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
      - symbol_id: SYM-proof-scoped-check-budget
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
      test_id: TEST-proof-scoped-check-budget
      variable: scoped_check_budget_chars
      value_type: int
      assumptions:
        - operator: eq
          value: 24000
      claim:
        operator: eq
        value: 24000
    certificate_digest: 4cae18eb7301602629503b2d21473c871ddd7f9097f843825505b4bfde656b50
    claim_bindings:
      - claim_key: CLAIM-5DD822300CD53C9C
        requirement_id: REQ-kibi-scoped-check-output
        fact_id: FACT-kibi-scoped-check-budget-chars
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 24000
          value_type: int
          variable: scoped_check_budget_chars
---
Proves that the scoped kb_check output budget shall be 24,000 characters, against the code Kibi reads at ingest.