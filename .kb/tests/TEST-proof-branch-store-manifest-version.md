---
title: The branch store manifest version shall be 1, by an arithmetic proof
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
    - symbol_id: SYM-proof-branch-store-manifest-version
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-auto-EB53162A3CF2
  proves:
    - CLAIM-D653A6B3705B105D
origin:
  kind: agent
  recorded_at: '2026-10-28T20:42:48.560Z'
id: TEST-proof-branch-store-manifest-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e8aa7da77eb7e2d6b4b02651
    test_id: TEST-proof-branch-store-manifest-version
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: cd6e6a10bf3edd8e2fb52a98c31845bc9fe63b22501f6d43ce591901dcf62e2d
    binding_hash: dd9255e90ef6cb3162305089a890d9ec00bc354015455244f2fca76868896022
    fingerprint: b3fbaeb4648502278e4507310fb9adc03f66085c6a154d95b944221591adf2e6
    fingerprint_components:
      contract: cd6e6a10bf3edd8e2fb52a98c31845bc9fe63b22501f6d43ce591901dcf62e2d
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
      - symbol_id: SYM-proof-branch-store-manifest-version
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
      test_id: TEST-proof-branch-store-manifest-version
      variable: manifest_version
      value_type: int
      assumptions:
        - operator: eq
          value: 1
      claim:
        operator: eq
        value: 1
    certificate_digest: c75dddd487417676def891f516d042d6bcc8d83d229a6244cfc5d3bec09ac3ea
    claim_bindings:
      - claim_key: CLAIM-D653A6B3705B105D
        requirement_id: REQ-branch-store-settings
        fact_id: FACT-branch-store-manifest-version
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 1
          value_type: int
          variable: manifest_version
---
Proves that the branch store manifest version shall be 1, against the code Kibi reads at ingest.