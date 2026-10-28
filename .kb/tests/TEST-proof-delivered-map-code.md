---
title: The delivered status migration code shall be req_status_delivered_map, by a regex proof
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
    - symbol_id: SYM-proof-delivered-map-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-REQ_STATUS_DELIVERED_MAP_CODE
  proves:
    - CLAIM-1AF42E148EEE9D9C
origin:
  kind: agent
  recorded_at: '2026-10-28T17:42:58.574Z'
id: TEST-proof-delivered-map-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-81175d643c6ecf3967766608
    test_id: TEST-proof-delivered-map-code
    scope: unit
    outcome: passed
    code_snapshot: 6c5b25823ef6cbf009fe70ee8955458c0021056cbc5b1d725647c41af19ef199
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:44:39.593Z'
    finished_at: '2026-10-28T17:44:39.777Z'
    artifact_digest: 067aae757d7ab7d735e30c2ba54d3399d85e76fdfb0a9a1efc89c1f75119c487
    contract_hash: 4045f5307f95bb77873612a3a6e642389da5a76221ab35ae7ca9a2f510b5fc10
    binding_hash: 6507507c498a53fbf2302ccb7c3085f869b6950e6b2d7f22f18e7f68c9f28525
    fingerprint: 5e92ac2123f74850aea8a4988c23d136d3b40d4f7d932f67d6340e9d909e97de
    fingerprint_components:
      contract: 4045f5307f95bb77873612a3a6e642389da5a76221ab35ae7ca9a2f510b5fc10
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
      - symbol_id: SYM-proof-delivered-map-code
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
      test_id: TEST-proof-delivered-map-code
      pattern:
        symbol_id: SYM-schema6-REQ_STATUS_DELIVERED_MAP_CODE
        type: string
        value: req_status_delivered_map
    certificate_digest: 869aa4cdb60153ee0b659a653e0c4a3b143a829de36e7e4d88eb663bc907260f
    claim_bindings:
      - claim_key: CLAIM-1AF42E148EEE9D9C
        requirement_id: REQ-cli-migration-action-codes
        fact_id: FACT-delivered-map-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: req_status_delivered_map
---
Proves that the delivered status migration code shall be req_status_delivered_map, against the code Kibi reads at ingest.