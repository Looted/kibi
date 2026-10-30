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
    receipt_id: PR-2963a2fd9945cb8c31bbea11
    test_id: TEST-proof-branch-store-manifest-version
    scope: unit
    outcome: passed
    code_snapshot: 6c1d4b48c8c790bbc509e46899ccd457757c7db5641cef07df4b567f347481bf
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:45:04.220Z'
    finished_at: '2026-10-28T20:45:04.355Z'
    artifact_digest: bd473e15d8daed95e26109712947dc9ca0d879479093fe36b1fce82709570dcc
    contract_hash: cd6e6a10bf3edd8e2fb52a98c31845bc9fe63b22501f6d43ce591901dcf62e2d
    binding_hash: 27038869091f77ea0d060785467f1cd15255fd6cd80f24fec1ce59dc992e209a
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