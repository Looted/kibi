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
    receipt_id: PR-6636d21a90e35da29fc59227
    test_id: TEST-proof-signoff-change-changed-label
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 0e9c08d9579fcf54ac4484ee12c8be61229dd242b33c5bdcd6df44db5f05e6b2
    binding_hash: 3f3366914d83f86674e2e9309bfaa73a5424be5be67ab6309ec90b30e6debdf3
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