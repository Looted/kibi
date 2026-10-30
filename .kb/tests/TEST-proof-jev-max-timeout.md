---
title: The maximum Jev timeout is 120000 milliseconds, by an arithmetic proof
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
    - symbol_id: SYM-proof-jev-max-timeout
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-jev-max-timeout-ms
  proves:
    - CLAIM-85B214C0394CFC7C
origin:
  kind: agent
  recorded_at: '2026-10-28T09:37:00.872Z'
id: TEST-proof-jev-max-timeout
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-01b542909b8b485e8835ff80
    test_id: TEST-proof-jev-max-timeout
    scope: unit
    outcome: passed
    code_snapshot: 374c0615cf4ed585796e9ab43d3b69c8e4593f2471fb8597c2a06ba7a14aad48
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T09:37:39.444Z'
    finished_at: '2026-10-28T09:37:39.551Z'
    artifact_digest: 6509796dd251d38a9627f1990d799ea1f01938b7a70102ac611b326513ed6dfc
    contract_hash: cb400eef3ea81b71026f1f995b83197267b9f4b65a2b0b019596b79a18621487
    binding_hash: d84559f46e3c57e1b82c27a46ab0bf5d6f04ec112afb1141af740deaa8abe760
    fingerprint: e095667f63b709421f33ab62c29eef5b6189ffb92c239e5001c2e8222de77682
    fingerprint_components:
      contract: cb400eef3ea81b71026f1f995b83197267b9f4b65a2b0b019596b79a18621487
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
      - symbol_id: SYM-proof-jev-max-timeout
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
      test_id: TEST-proof-jev-max-timeout
      variable: max_timeout_ms
      value_type: int
      assumptions:
        - operator: eq
          value: 120000
      claim:
        operator: eq
        value: 120000
    certificate_digest: d18ef3e8d0a88c5129f49d7015d519407fe0c9ebea37ef88d2541bb6d6722450
    claim_bindings:
      - claim_key: CLAIM-85B214C0394CFC7C
        requirement_id: REQ-capability-plugin-jev-defaults
        fact_id: FACT-jev-max-timeout-ms
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 120000
          value_type: int
          variable: max_timeout_ms
---
Reads JEV_MAX_TIMEOUT_MS and proves the maximum Jev timeout is 120000 milliseconds.