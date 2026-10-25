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
    - CLAIM-296F27003E43BA8A
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:43.873Z'
id: TEST-kibi-code-proof-kinds-exhaustive
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-206aa0f6e746ab380f5cf25b
    test_id: TEST-kibi-code-proof-kinds-exhaustive
    scope: unit
    outcome: passed
    code_snapshot: 88f72ac7863bc053137ae0fbd6e7ea179d4fbf9dd5cb363152f2b4fc11739754
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T18:53:40.517Z'
    finished_at: '2026-10-25T18:53:40.929Z'
    artifact_digest: 5ba03a7dc951ed6a9eed61a77a20e6ab5879ccbf8838b77183379c9792d2e9b9
    contract_hash: 69f6cbff8ad79263d0324bb7369332fa54c0972c53f45be9bbd64a81e45cdc90
    binding_hash: 66e407196fcb1ffb306ed54b84c1de97b922ff508fc18c12701841a06d0834e1
    fingerprint: 39d577820ebd935d8ba73c8840aeb63318faf6610ba71095be1b2ed5654f68ae
    fingerprint_components:
      contract: 69f6cbff8ad79263d0324bb7369332fa54c0972c53f45be9bbd64a81e45cdc90
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
    certificate_digest: 8fffc1f6ca5dd776bde850ce95b5182993520b4f517b3e7d5164ef8f8bd1732d
    claim_bindings:
      - claim_key: CLAIM-296F27003E43BA8A
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
            - smt
            - typecheck
---
Checks every member of PROOF_KINDS: a runner kind earns tested without a certificate, and for each certificate kind a valid certificate re-checks in code_certificates.pl with the receipt's digest while every tampered variant is rejected; the run leaves an exhaustive certificate over PROOF_KINDS.