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
    receipt_id: PR-905d2572afa45ae19f3be683
    test_id: TEST-proof-source-path-review-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: eb2da3800ee28deb3eebbc7b1def55fbb97c16919a0b5b5962a838740a6d8604
    binding_hash: 9745076d6afe2075d8375ae530cc264c42414fd7b239d50600f181f0645ff8ec
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
        requirement_id: REQ-kibi-source-path-codes
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