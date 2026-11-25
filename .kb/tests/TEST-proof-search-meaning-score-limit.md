---
title: A kibi.search-hints.v1 request scores at most 50000 entities, by an arithmetic proof
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
    - symbol_id: SYM-proof-search-meaning-score-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-search-hints-max-limit
  proves:
    - CLAIM-371DE5AA30FDA0A5
origin:
  kind: agent
  recorded_at: '2026-11-25T19:27:00.235Z'
id: TEST-proof-search-meaning-score-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-94d820b82183f06d2225bd04
    test_id: TEST-proof-search-meaning-score-limit
    scope: unit
    outcome: passed
    code_snapshot: 6e77aa8491803349200bf000f91038c8e3ce1969155ba14cb5bad5a774bd6c1e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T20:07:07.720Z'
    finished_at: '2026-11-25T20:07:07.872Z'
    artifact_digest: 2bd917e035d1edd864a491a42c047cb4b8fcdf5d2596e1ae29b05f2875765c83
    contract_hash: c1c3c4de250b09b97a429e7340642f948b9e1da4c377525d522002737ee9ead6
    binding_hash: 713758121368f5d5d2841664cef4e96151a0af194739b3b95dedc39bdd1e1e67
    fingerprint: 647ab2b86c218d4dbe5f92ae4d3acda1211009a4f7b447dc080440c06a0aae18
    fingerprint_components:
      contract: c1c3c4de250b09b97a429e7340642f948b9e1da4c377525d522002737ee9ead6
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
      - symbol_id: SYM-proof-search-meaning-score-limit
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
      test_id: TEST-proof-search-meaning-score-limit
      variable: max_scored_entities
      value_type: int
      assumptions:
        - operator: eq
          value: 50000
      claim:
        operator: lte
        value: 50000
    certificate_digest: afbbdf1d951ceee1302983936baac93558552a047f884c81af781b74c9ec5ebd
    claim_bindings:
      - claim_key: CLAIM-371DE5AA30FDA0A5
        requirement_id: REQ-search-meaning-limits
        fact_id: FACT-search-meaning-limits-max-scored-entities
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: lte
          value: 50000
          value_type: int
          variable: max_scored_entities
---
Writes the arithmetic certificate meaningScoreLimitCertificate in packages/cli/tests/proofs/claims/search-meaning-limits.proof.test.ts: it assumes the value SYM-search-hints-max-limit holds and claims the bound of FACT-search-meaning-limits-max-scored-entities. Kibi reads the constant again at ingest and re-checks the certificate.