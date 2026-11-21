---
title: A fact query kind filter shall be subject, property_value, predicate, predicate_schema, observation, meta, rule or rule_schema, by an exhaustive proof
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
    - symbol_id: SYM-proof-query-fact-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-discovery-fact-kinds
  proves:
    - CLAIM-3253623B1A7BA74D
origin:
  kind: agent
  recorded_at: '2026-10-29T10:33:46.989Z'
id: TEST-proof-query-fact-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-40e7df213799dd722095e9c5
    test_id: TEST-proof-query-fact-kinds
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 2e751d85d77dfc3a9d667894b0f251389faaf604ae030909876f3c93bf452331
    binding_hash: f54a584078756296640e7a504aedf15fb817a1c84f5298b41298ac9ec2cb9548
    fingerprint: a39b2daf7af6ee1770243e6fe01b249f54cbd10308c79039e4943992fe7321a2
    fingerprint_components:
      contract: 2e751d85d77dfc3a9d667894b0f251389faaf604ae030909876f3c93bf452331
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
      - symbol_id: SYM-proof-query-fact-kinds
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
      test_id: TEST-proof-query-fact-kinds
      domain:
        symbol_id: SYM-discovery-fact-kinds
        members:
          - subject
          - property_value
          - predicate
          - predicate_schema
          - observation
          - meta
          - rule
          - rule_schema
      results:
        - member: subject
          outcome: passed
        - member: property_value
          outcome: passed
        - member: predicate
          outcome: passed
        - member: predicate_schema
          outcome: passed
        - member: observation
          outcome: passed
        - member: meta
          outcome: passed
        - member: rule
          outcome: passed
        - member: rule_schema
          outcome: passed
    certificate_digest: 7c5e9ab2dc77e9fe5e4759a094805eb424065f54532e8b12d0d5915226f3ae6e
    claim_bindings:
      - claim_key: CLAIM-3253623B1A7BA74D
        requirement_id: REQ-kibi-query-fact-kinds
        fact_id: FACT-query-fact-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - meta
            - observation
            - predicate
            - predicate_schema
            - property_value
            - rule
            - rule_schema
            - subject
---
Proves that a fact query kind filter shall be subject, property_value, predicate, predicate_schema, observation, meta, rule or rule_schema, against the code Kibi reads at ingest.