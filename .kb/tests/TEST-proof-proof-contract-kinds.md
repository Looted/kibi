---
title: A proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source, by an exhaustive proof
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
    - symbol_id: SYM-proof-proof-contract-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-proof-kinds
  proves:
    - CLAIM-D7B715B13C00E1A9
origin:
  kind: agent
  recorded_at: '2026-10-29T16:44:58.349Z'
id: TEST-proof-proof-contract-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ba744b91e8e508e45573efe4
    test_id: TEST-proof-proof-contract-kinds
    scope: unit
    outcome: passed
    code_snapshot: 7419ad5232bdbe1da8fca26f74b4b9ead24f00ba6d0d7de0f96f555646c2e065
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T21:09:11.644Z'
    finished_at: '2026-11-20T21:19:43.232Z'
    artifact_digest: 7139602fb04835015fd589e7172c5d2d08aef422be8d030f6da4a15ac11ca687
    contract_hash: 72eaf63a93cbc4ef0b23fb7dd6cb25a8bdf19bc525a7fbd7c09af3a5274d81fb
    binding_hash: 84862693c151ac45c0d6fe26daf1e1047df5cf5199bdf15887bf233c058b472f
    fingerprint: 39107731c440b0f68b2081f9edb7f1e471355fbedee9c686bef35567cfffeec3
    fingerprint_components:
      contract: 72eaf63a93cbc4ef0b23fb7dd6cb25a8bdf19bc525a7fbd7c09af3a5274d81fb
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
      - symbol_id: SYM-proof-proof-contract-kinds
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
      test_id: TEST-proof-proof-contract-kinds
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
    certificate_digest: 83daf1f9a5da35e59c218d0884f3a5c0866153b89e6c2aacd2bb3cf19b9fefda
    claim_bindings:
      - claim_key: CLAIM-D7B715B13C00E1A9
        requirement_id: REQ-kibi-proof-vocabulary
        fact_id: FACT-proof-contract-kinds
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
Proves that a proof contract kind shall be e2e, example, property, exhaustive, typecheck, arithmetic, smt, rule, state_machine, regex or source, against the code Kibi reads at ingest.