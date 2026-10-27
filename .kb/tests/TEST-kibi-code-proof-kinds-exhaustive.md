---
title: Every proof kind supports exactly its evidence level
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-code-proof-kinds-exhaustive
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-proof-kinds
  proves:
    - CLAIM-AEDC5DE05A243DB4
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:43.873Z'
id: TEST-kibi-code-proof-kinds-exhaustive
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9628dc07ddfc65ee52f2b501
    test_id: TEST-kibi-code-proof-kinds-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: e7ef7119bcc90f0b8409339ad2246d8e19fdffcaa2429ca3ccda3a5b7dc8f4b1
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T08:00:55.717Z'
    finished_at: '2026-10-27T08:00:57.119Z'
    artifact_digest: cc842de9711afc968434efc65501e494d0d62b8398f0a3aaae52ddc2037cdadf
    contract_hash: e62830101503e23a415f90aa530c8191b0f3fb5b11adc01e8926575ad07efb3a
    binding_hash: 7081b6626d103cf9c8520f6cb24f9821f601f6daaa9a9345ddaea05eeb9e1872
    fingerprint: b4c2285f58220bd0bb0a45984588de8b4996607c7a16ea3efe5693834e2daafc
    fingerprint_components:
      contract: e62830101503e23a415f90aa530c8191b0f3fb5b11adc01e8926575ad07efb3a
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
      - symbol_id: SYM-test-code-proof-kinds-exhaustive
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-kibi-code-proof-kinds-exhaustive
      domain:
        symbol_id: SYM-proof-kinds
        members:
          - e2e
          - example
          - property
          - exhaustive
          - typecheck
          - arithmetic
          - smt
          - rule
          - state_machine
          - regex
          - source
      results:
        - member: e2e
          outcome: passed
        - member: example
          outcome: passed
        - member: property
          outcome: passed
        - member: exhaustive
          outcome: passed
        - member: typecheck
          outcome: passed
        - member: arithmetic
          outcome: passed
        - member: smt
          outcome: passed
        - member: rule
          outcome: passed
        - member: state_machine
          outcome: passed
        - member: regex
          outcome: passed
        - member: source
          outcome: passed
    certificate_digest: 38541cefad6f9c96bbf1af740396292d76b42fc04b9b9bae5adeb31250d28e41
    claim_bindings:
      - claim_key: CLAIM-AEDC5DE05A243DB4
        requirement_id: REQ-kibi-code-proof-kinds
        fact_id: FACT-kibi-code-proof-kind-vocabulary-closed
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - arithmetic
            - e2e
            - example
            - exhaustive
            - property
            - regex
            - rule
            - smt
            - source
            - state_machine
            - typecheck
---
Checks every member of PROOF_KINDS: a runner kind earns tested without a certificate, and for each certificate kind a valid certificate re-checks in code_certificates.pl with the receipt's digest while every tampered variant is rejected; the run leaves an exhaustive certificate over PROOF_KINDS.