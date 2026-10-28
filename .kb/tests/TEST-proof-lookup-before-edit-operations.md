---
title: A lookup before an edit shall be kb_query or kb_search, by an exhaustive proof
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
    - symbol_id: SYM-proof-lookup-before-edit-operations
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-lookup-before-edit-operations
  proves:
    - CLAIM-F1C97CDB0D53ED42
origin:
  kind: agent
  recorded_at: '2026-10-28T20:53:11.219Z'
id: TEST-proof-lookup-before-edit-operations
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f2a6099e8cc0cfefe911d064
    test_id: TEST-proof-lookup-before-edit-operations
    scope: unit
    outcome: passed
    code_snapshot: 25d6f9f7c94412ebd022bf7299d1f96ef3ecdaebd005b4d852c619957f6bd1ad
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:54:53.757Z'
    finished_at: '2026-10-28T20:54:53.912Z'
    artifact_digest: cdcb2a6de59ef3b93176cd245ea81a84f0deb0c8c0c47037cad82db818d2dcca
    contract_hash: c59ffc685d8f018458efed36f30c8c1f1912e2deb66c367bee1a683bd638b57b
    binding_hash: 14b28828dee7a8e299c008e97c204f812fae6c5ed0e678f193eaebf05dac38e2
    fingerprint: 313947ca1092fba1892bb709a2060542e3c36c6a3aa3a3ef5485dab186e00ee0
    fingerprint_components:
      contract: c59ffc685d8f018458efed36f30c8c1f1912e2deb66c367bee1a683bd638b57b
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
      - symbol_id: SYM-proof-lookup-before-edit-operations
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
      test_id: TEST-proof-lookup-before-edit-operations
      domain:
        symbol_id: SYM-const-lookup-before-edit-operations
        members:
          - kb_query
          - kb_search
      results:
        - member: kb_query
          outcome: passed
        - member: kb_search
          outcome: passed
    certificate_digest: 9ddda45b0defc7680265991f838251f99f1ec1aa2783e9bd9b27e98c31627e9f
    claim_bindings:
      - claim_key: CLAIM-F1C97CDB0D53ED42
        requirement_id: REQ-kibi-telemetry-versions
        fact_id: FACT-lookup-before-edit-operations
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kb_query
            - kb_search
---
Proves that a lookup before an edit shall be kb_query or kb_search, against the code Kibi reads at ingest.