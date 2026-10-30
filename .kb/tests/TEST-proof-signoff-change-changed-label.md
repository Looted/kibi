---
title: The signoff label of a changed change shall be Changed, by a regex proof
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
    - symbol_id: SYM-proof-signoff-change-changed-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-change-labels
    export: SIGNOFF_CHANGE_LABELS.changed
  proves:
    - CLAIM-0FCFE3224FE26F61
origin:
  kind: agent
  recorded_at: '2026-10-28T22:24:33.285Z'
id: TEST-proof-signoff-change-changed-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1aa48c3b29e4d88df8b3cbef
    test_id: TEST-proof-signoff-change-changed-label
    scope: unit
    outcome: passed
    code_snapshot: ae80779d8bd151a480cd15de82d5463751f28e41804143ed52280230999e584f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:27:17.729Z'
    finished_at: '2026-10-28T22:27:17.829Z'
    artifact_digest: 7d23364a4c50ddd3fb337c11bbf342cd66387a8a6a21358cb878be78a68bed86
    contract_hash: 0e9c08d9579fcf54ac4484ee12c8be61229dd242b33c5bdcd6df44db5f05e6b2
    binding_hash: 149e596ba64a9eb6d3341aac372efd5e0464e23f8f8ffc7c456792904755ea37
    fingerprint: 0c4068e508b472c9404396ef58426f22f04d2cb2d3e89fd33d0e6caeae3c12d1
    fingerprint_components:
      contract: 0e9c08d9579fcf54ac4484ee12c8be61229dd242b33c5bdcd6df44db5f05e6b2
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
      - symbol_id: SYM-proof-signoff-change-changed-label
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
      test_id: TEST-proof-signoff-change-changed-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-change-labels
        type: string
        value: Changed
    certificate_digest: 954abfd1a95d538daa9842cc75a27d4460ddc0939bb6271e657a4a5e1b92ab2a
    claim_bindings:
      - claim_key: CLAIM-0FCFE3224FE26F61
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-change-changed-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: Changed
---
Proves that the signoff label of a changed change shall be Changed, against the code Kibi reads at ingest.