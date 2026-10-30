---
title: The generated symbol fields shall be sourceLine, sourceColumn, sourceEndLine, sourceEndColumn and coordinatesGeneratedAt, by an exhaustive proof
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
    - symbol_id: SYM-proof-generated-symbol-fields
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-GENERATED_SYMBOL_FIELDS
  proves:
    - CLAIM-5A378556E38551B7
origin:
  kind: agent
  recorded_at: '2026-10-28T11:13:32.821Z'
id: TEST-proof-generated-symbol-fields
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8f2e72c804eb4768b721f457
    test_id: TEST-proof-generated-symbol-fields
    scope: unit
    outcome: passed
    code_snapshot: ac909ff52412d46a423958b88002491f7617fe6f316b2554d008e1895ca6059b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:15:20.394Z'
    finished_at: '2026-10-28T11:15:20.544Z'
    artifact_digest: e583b34a4e3cbd89d43b9d8bd383fd1ffad168e83cb80c9136008fa5e9a2896c
    contract_hash: dad5fd96efab10b1dbdd2ef1ca3d39fa9bea675cdbdcf1b30f2384f61717df27
    binding_hash: 26aa24f292d5cb073c94166ced6016b43beb43278ef6e5273e8130e5b82950de
    fingerprint: c8eff9736639fb657502bc7a0bcf4cc2e0485c9db8bd7ebea33191aa7bea2c59
    fingerprint_components:
      contract: dad5fd96efab10b1dbdd2ef1ca3d39fa9bea675cdbdcf1b30f2384f61717df27
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
      - symbol_id: SYM-proof-generated-symbol-fields
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
      test_id: TEST-proof-generated-symbol-fields
      domain:
        symbol_id: SYM-GENERATED_SYMBOL_FIELDS
        members:
          - sourceLine
          - sourceColumn
          - sourceEndLine
          - sourceEndColumn
          - coordinatesGeneratedAt
      results:
        - member: sourceLine
          outcome: passed
        - member: sourceColumn
          outcome: passed
        - member: sourceEndLine
          outcome: passed
        - member: sourceEndColumn
          outcome: passed
        - member: coordinatesGeneratedAt
          outcome: passed
    certificate_digest: 87ef25fc92a377d6e0972b781bdeda54968d760f65a973c26557c165a936efef
    claim_bindings:
      - claim_key: CLAIM-5A378556E38551B7
        requirement_id: REQ-generated-coordinate-settings
        fact_id: FACT-generated-symbol-fields
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - coordinatesGeneratedAt
            - sourceColumn
            - sourceEndColumn
            - sourceEndLine
            - sourceLine
---
Proves that the generated symbol fields shall be sourceLine, sourceColumn, sourceEndLine, sourceEndColumn and coordinatesGeneratedAt, against the code Kibi reads at ingest.