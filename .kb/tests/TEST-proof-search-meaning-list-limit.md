---
title: The kb_search meaning list holds at most 7 decisions, by an arithmetic proof
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
    - symbol_id: SYM-proof-search-meaning-list-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-meaning-list-limit
  proves:
    - CLAIM-34F3B0773620022A
origin:
  kind: agent
  recorded_at: '2026-11-25T19:26:50.654Z'
id: TEST-proof-search-meaning-list-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d21afdbb6d4373de914a28f3
    test_id: TEST-proof-search-meaning-list-limit
    scope: unit
    outcome: passed
    code_snapshot: 6e77aa8491803349200bf000f91038c8e3ce1969155ba14cb5bad5a774bd6c1e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T20:07:07.720Z'
    finished_at: '2026-11-25T20:07:07.872Z'
    artifact_digest: 2bd917e035d1edd864a491a42c047cb4b8fcdf5d2596e1ae29b05f2875765c83
    contract_hash: 57ca02d9c5880989d662955b00c75830555814a01ca65dc453e7a3e66fd73619
    binding_hash: d309962f6078f3ad10f445722b2258fddc983bbf9c7b22225eafcbc99ebd516f
    fingerprint: 2026c91154dbe12d9953378d49d144df6f40380f848191d330c366a8a2e389da
    fingerprint_components:
      contract: 57ca02d9c5880989d662955b00c75830555814a01ca65dc453e7a3e66fd73619
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
      - symbol_id: SYM-proof-search-meaning-list-limit
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
      test_id: TEST-proof-search-meaning-list-limit
      variable: max_meaning_decisions
      value_type: int
      assumptions:
        - operator: eq
          value: 7
      claim:
        operator: lte
        value: 7
    certificate_digest: 66515ef6a8ab57d605ea806be79a68dd294e0fe70c7d9975b8d2f2d2b200896b
    claim_bindings:
      - claim_key: CLAIM-34F3B0773620022A
        requirement_id: REQ-search-meaning-limits
        fact_id: FACT-search-meaning-limits-max-meaning-decisions
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: lte
          value: 7
          value_type: int
          variable: max_meaning_decisions
---
Writes the arithmetic certificate meaningListLimitCertificate in packages/cli/tests/proofs/claims/search-meaning-limits.proof.test.ts: it assumes the value SYM-const-meaning-list-limit holds and claims the bound of FACT-search-meaning-limits-max-meaning-decisions. Kibi reads the constant again at ingest and re-checks the certificate.