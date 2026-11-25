---
title: The kb_search meaning weight is 0.5, by an arithmetic proof
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
    - symbol_id: SYM-proof-search-meaning-weight
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-meaning-weight
  proves:
    - CLAIM-70305D5C0ABA4A52
origin:
  kind: agent
  recorded_at: '2026-11-25T19:27:08.884Z'
id: TEST-proof-search-meaning-weight
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7811cac2f324ba14f55c978a
    test_id: TEST-proof-search-meaning-weight
    scope: unit
    outcome: passed
    code_snapshot: 6e77aa8491803349200bf000f91038c8e3ce1969155ba14cb5bad5a774bd6c1e
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T20:07:07.720Z'
    finished_at: '2026-11-25T20:07:07.872Z'
    artifact_digest: 2bd917e035d1edd864a491a42c047cb4b8fcdf5d2596e1ae29b05f2875765c83
    contract_hash: bc2e76e8eeaaedf75809c7215b2b39dac3b0b7100578136c90bb3c42a83df11d
    binding_hash: 222a41b923dc6150cd4e7130e569d8a3947163543501f7d11cb543395c71be5a
    fingerprint: 551015698d6f766e771ee6940e92a82b40f8909fa8a04da7c2adc43ca1a7298c
    fingerprint_components:
      contract: bc2e76e8eeaaedf75809c7215b2b39dac3b0b7100578136c90bb3c42a83df11d
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
      - symbol_id: SYM-proof-search-meaning-weight
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
      test_id: TEST-proof-search-meaning-weight
      variable: meaning_weight
      value_type: real
      assumptions:
        - operator: eq
          value: 0.5
      claim:
        operator: eq
        value: 0.5
    certificate_digest: 3bfd44e5e96d278f805e83a63148174a0a32554c6e944bf797e364995f5e6215
    claim_bindings:
      - claim_key: CLAIM-70305D5C0ABA4A52
        requirement_id: REQ-search-meaning-limits
        fact_id: FACT-search-meaning-limits-meaning-weight
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.5
          value_type: real
          variable: meaning_weight
---
Writes the arithmetic certificate meaningWeightCertificate in packages/cli/tests/proofs/claims/search-meaning-limits.proof.test.ts: it assumes the value SYM-const-meaning-weight holds and claims the bound of FACT-search-meaning-limits-meaning-weight. Kibi reads the constant again at ingest and re-checks the certificate.