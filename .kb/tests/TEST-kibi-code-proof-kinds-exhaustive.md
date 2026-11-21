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
    receipt_id: PR-33a6531fbaf84928cebe877c
    test_id: TEST-kibi-code-proof-kinds-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: e62830101503e23a415f90aa530c8191b0f3fb5b11adc01e8926575ad07efb3a
    binding_hash: cdd40d415a23aef5f26f6cb6be173ec36c74b498398583ed8d50688126716da6
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
        requirement_id: REQ-kibi-proof-kind-vocabulary
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