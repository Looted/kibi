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
    receipt_id: PR-81f40b5e268255b186733bcd
    test_id: TEST-proof-query-fact-kinds
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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