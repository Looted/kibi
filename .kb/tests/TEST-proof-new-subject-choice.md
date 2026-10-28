---
title: The vocabulary alignment choice that keeps a new subject shall be new_subject, by a regex proof
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
    - symbol_id: SYM-proof-new-subject-choice
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-new-subject-choice
  proves:
    - CLAIM-7F4D272E71DE484E
origin:
  kind: agent
  recorded_at: '2026-10-28T10:46:05.717Z'
id: TEST-proof-new-subject-choice
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-75af5c1609dbf600708dc38c
    test_id: TEST-proof-new-subject-choice
    scope: unit
    outcome: passed
    code_snapshot: 95a215c6d20126c89df30d26a323349cf6e7ee9aa9002e5ee1935fc5b3c6bf78
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:48:22.692Z'
    finished_at: '2026-10-28T10:48:22.865Z'
    artifact_digest: 93568f23efe10ae3f78efa79ff08fc8b4fde841630ec27fedfa8c7ab8ee2a8a0
    contract_hash: f261ff1107008c7e8ce018ab0ddae3c25e7e4ad01b9279ace63b1b7a4250a04c
    binding_hash: b5d68723e8b87ecf5f008c6b57b5bd28c81b14e0ab87516281570e3f55ab11ec
    fingerprint: d7844db1849a5d75e13e0fbfff4d1938a76b03e7e82891a1979491f44add4f33
    fingerprint_components:
      contract: f261ff1107008c7e8ce018ab0ddae3c25e7e4ad01b9279ace63b1b7a4250a04c
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
      - symbol_id: SYM-proof-new-subject-choice
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
      test_id: TEST-proof-new-subject-choice
      pattern:
        symbol_id: SYM-const-new-subject-choice
        type: string
        value: new_subject
    certificate_digest: 987f536d7e0db92082484aaed3ac1e83771b735b461637ebd06f6d561d377ec1
    claim_bindings:
      - claim_key: CLAIM-7F4D272E71DE484E
        requirement_id: REQ-kibi-vocabulary-alignment-settings
        fact_id: FACT-new-subject-choice
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: new_subject
---
Proves that the vocabulary alignment choice that keeps a new subject shall be new_subject, against the code Kibi reads at ingest.