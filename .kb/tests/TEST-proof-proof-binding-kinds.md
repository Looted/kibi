---
title: A proof binding kind shall be native_case or aggregate_run, by an exhaustive proof
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
    - symbol_id: SYM-proof-proof-binding-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-proof-binding-kinds
  proves:
    - CLAIM-3A5E7E22374EF666
origin:
  kind: agent
  recorded_at: '2026-10-28T17:48:33.832Z'
id: TEST-proof-proof-binding-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f55cc9e8fa8a55eb95fc10ee
    test_id: TEST-proof-proof-binding-kinds
    scope: unit
    outcome: passed
    code_snapshot: 17256581582f43d83f66f4d6a118fecad7fcd8180df991d47ca9887713e21e82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:52:17.229Z'
    finished_at: '2026-10-28T17:52:17.399Z'
    artifact_digest: 267fb5ea4b660d89dad841cf07904f14c4435c81a446c7b31da49cf03c029b3b
    contract_hash: ef0554c996722ce79e70a76a7e0d2d16740ad75fa5d546438b26470f744b1b6d
    binding_hash: 33c915232f1bc5b1149672adb4345fec0605ec6c5dc3a010b0003eb2f4d2e343
    fingerprint: 24ad3e78434b208a4f0a43d72014b1acb471f4abb17374e86680395989b663e0
    fingerprint_components:
      contract: ef0554c996722ce79e70a76a7e0d2d16740ad75fa5d546438b26470f744b1b6d
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
      - symbol_id: SYM-proof-proof-binding-kinds
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
      test_id: TEST-proof-proof-binding-kinds
      domain:
        symbol_id: SYM-proof-binding-kinds
        members:
          - native_case
          - aggregate_run
      results:
        - member: native_case
          outcome: passed
        - member: aggregate_run
          outcome: passed
    certificate_digest: be7c936ac454c282a122d7503d82714c8be5ccf81f011d57f04f108f1e1e5c8f
    claim_bindings:
      - claim_key: CLAIM-3A5E7E22374EF666
        requirement_id: REQ-kibi-proof-run-vocabulary
        fact_id: FACT-proof-binding-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - aggregate_run
            - native_case
---
Proves that a proof binding kind shall be native_case or aggregate_run, against the code Kibi reads at ingest.