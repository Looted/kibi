---
title: The kb_search default card count is 5, by an arithmetic proof
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
    - symbol_id: SYM-proof-search-decision-card-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-decision-card-limit
  proves:
    - CLAIM-65E191858CF4CFBC
origin:
  kind: agent
  recorded_at: '2026-11-25T19:27:17.126Z'
id: TEST-proof-search-decision-card-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b7150ab1af00c744f122241c
    test_id: TEST-proof-search-decision-card-limit
    scope: unit
    outcome: passed
    code_snapshot: 6e77aa8491803349200bf000f91038c8e3ce1969155ba14cb5bad5a774bd6c1e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T20:06:53.003Z'
    finished_at: '2026-11-25T20:06:53.153Z'
    artifact_digest: 0129a4504ffe2f54c63b8d79e58085628882e1efee8a917819515b9c81e27d8b
    contract_hash: a3ef92c659798e83a5c192e5c22e7c1b60e35e9f9a46c77ebcac6a2326a4bd09
    binding_hash: 994bf45a4a5e62392c7490cf874d0a0500c81ef7e9fc134ab6e8017a7528d7ae
    fingerprint: 31f1c0a10ebb384231346773738a1241593266fc0d70ed72480538acdc5e325c
    fingerprint_components:
      contract: a3ef92c659798e83a5c192e5c22e7c1b60e35e9f9a46c77ebcac6a2326a4bd09
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
      - symbol_id: SYM-proof-search-decision-card-limit
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
      test_id: TEST-proof-search-decision-card-limit
      variable: default_decision_cards
      value_type: int
      assumptions:
        - operator: eq
          value: 5
      claim:
        operator: eq
        value: 5
    certificate_digest: 8b9ccb1b550174f9be54cdf25b7533bfcac68e9136636aed5d612c3f33b3fcfb
    claim_bindings:
      - claim_key: CLAIM-65E191858CF4CFBC
        requirement_id: REQ-search-meaning-limits
        fact_id: FACT-search-meaning-limits-default-decision-cards
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 5
          value_type: int
          variable: default_decision_cards
---
Writes the arithmetic certificate decisionCardLimitCertificate in packages/cli/tests/proofs/claims/search-meaning-limits.proof.test.ts: it assumes the value SYM-const-decision-card-limit holds and claims the bound of FACT-search-meaning-limits-default-decision-cards. Kibi reads the constant again at ingest and re-checks the certificate.