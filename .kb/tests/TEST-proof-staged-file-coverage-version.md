---
title: The staged file coverage result version shall be kibi.staged-file-coverage.v1, by a regex proof
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
    - symbol_id: SYM-proof-staged-file-coverage-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-staged-file-coverage-version
  proves:
    - CLAIM-9C9F066CBB5BD3DB
origin:
  kind: agent
  recorded_at: '2026-10-28T21:03:22.839Z'
id: TEST-proof-staged-file-coverage-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b03dee18cfcbc07caa696a75
    test_id: TEST-proof-staged-file-coverage-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 8c6d7d9841c3a0b1c5e4daa3fb489b14af47134315b707c81954d848a4051e61
    binding_hash: 7051b42904650e376e800e10fc1725b8b7bcd57cc1dcf7f2d22948c14cbcd12d
    fingerprint: 8bf64ff0d35d67e553818539aacb400fb7b9f264fdf993ec34b600960ea5ecc5
    fingerprint_components:
      contract: 8c6d7d9841c3a0b1c5e4daa3fb489b14af47134315b707c81954d848a4051e61
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
      - symbol_id: SYM-proof-staged-file-coverage-version
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
      test_id: TEST-proof-staged-file-coverage-version
      pattern:
        symbol_id: SYM-staged-file-coverage-version
        type: string
        value: kibi.staged-file-coverage.v1
    certificate_digest: 006392a2af909b7ccea26bd8765810ea87ec4739eff03f1a4284ca0e41b83a9d
    claim_bindings:
      - claim_key: CLAIM-9C9F066CBB5BD3DB
        requirement_id: REQ-staged-file-coverage-version
        fact_id: FACT-staged-file-coverage-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.staged-file-coverage.v1
---
Proves that the staged file coverage result version shall be kibi.staged-file-coverage.v1, against the code Kibi reads at ingest.