---
title: The dangling source path review code shall be review_source_path_dangling, by a regex proof
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
    - symbol_id: SYM-proof-source-path-review-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-SOURCE_PATH_REVIEW_CODE
  proves:
    - CLAIM-D5C09CC767D572F9
origin:
  kind: agent
  recorded_at: '2026-10-28T17:27:31.562Z'
id: TEST-proof-source-path-review-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f300ebcaebd7b50803227c9c
    test_id: TEST-proof-source-path-review-code
    scope: unit
    outcome: passed
    code_snapshot: 4b699c9b07afd709892fdd2513cb5f73a7167d1881b1a2daf6c70078e8f98147
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:30:50.657Z'
    finished_at: '2026-10-28T17:30:50.807Z'
    artifact_digest: cb86cb5c2e8b0a238ee28bf58498bad64a543536b342e94a01e92c91400e8e73
    contract_hash: eb2da3800ee28deb3eebbc7b1def55fbb97c16919a0b5b5962a838740a6d8604
    binding_hash: 0eae6c0ee11b38c04dd7dc2ebcf3d35a8d295da6aff2771e83e83a3730254ef9
    fingerprint: a081a47e1512e1c1527127769f324808c857a7de2bdf06c7e4b5408433f76bc1
    fingerprint_components:
      contract: eb2da3800ee28deb3eebbc7b1def55fbb97c16919a0b5b5962a838740a6d8604
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
      - symbol_id: SYM-proof-source-path-review-code
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
      test_id: TEST-proof-source-path-review-code
      pattern:
        symbol_id: SYM-schema6-check-actions-SOURCE_PATH_REVIEW_CODE
        type: string
        value: review_source_path_dangling
    certificate_digest: ab47e0f25e3fecefbde24e820885d7c4e229456d79c7a9a9b7cd97959ac132ff
    claim_bindings:
      - claim_key: CLAIM-D5C09CC767D572F9
        requirement_id: REQ-kibi-lifecycle-check-codes
        fact_id: FACT-source-path-review-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review_source_path_dangling
---
Proves that the dangling source path review code shall be review_source_path_dangling, against the code Kibi reads at ingest.