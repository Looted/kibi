---
title: A certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source, by an exhaustive proof
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
    - symbol_id: SYM-proof-certificate-proof-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-certificate-proof-kinds
  proves:
    - CLAIM-D723EBD2E0400142
origin:
  kind: agent
  recorded_at: '2026-10-29T16:45:36.383Z'
id: TEST-proof-certificate-proof-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-18e46e0b96f9953f249f2a85
    test_id: TEST-proof-certificate-proof-kinds
    scope: unit
    outcome: passed
    code_snapshot: 3ef679be4889b29bbf2035f91775c6f274ff1378dfca354d2d0e2fee8d047f47
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T16:50:12.476Z'
    finished_at: '2026-10-29T16:50:12.640Z'
    artifact_digest: c018bcd017a61a3ab6083e877340b3a2316d46527a36ef320d90b9e56f76fb2e
    contract_hash: f3fe3b52ef85b0cabbeddec662d1a15a0fc650f5233260212504fd4f86177a0b
    binding_hash: bec793a841f3da56af16256bd458e20a20b740d1747fd3608bb716d03bc2b940
    fingerprint: 77aed6a425e41bc87d70d6dc2120197f85c26573b6310d8d2ea3ba9d68a1efda
    fingerprint_components:
      contract: f3fe3b52ef85b0cabbeddec662d1a15a0fc650f5233260212504fd4f86177a0b
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
      - symbol_id: SYM-proof-certificate-proof-kinds
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
      test_id: TEST-proof-certificate-proof-kinds
      domain:
        symbol_id: SYM-const-certificate-proof-kinds
        members:
          - exhaustive
          - typecheck
          - arithmetic
          - smt
          - rule
          - state_machine
          - regex
          - source
      results:
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
    certificate_digest: 931c401489aeec59d3a1a30b6408e9f9cd573b0ffc320b3deac5781b8682631c
    claim_bindings:
      - claim_key: CLAIM-D723EBD2E0400142
        requirement_id: REQ-kibi-proof-vocabulary
        fact_id: FACT-certificate-proof-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - arithmetic
            - exhaustive
            - regex
            - rule
            - smt
            - source
            - state_machine
            - typecheck
---
Proves that a certificate proof kind shall be exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source, against the code Kibi reads at ingest.