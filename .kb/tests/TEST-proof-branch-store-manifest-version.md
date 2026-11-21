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
    receipt_id: PR-d511b7fb7a622c7b4eb55f16
    test_id: TEST-proof-branch-store-manifest-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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