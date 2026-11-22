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
    receipt_id: PR-98ba18a5129c07220cec34d9
    test_id: TEST-proof-delivered-map-code
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 4045f5307f95bb77873612a3a6e642389da5a76221ab35ae7ca9a2f510b5fc10
    binding_hash: 807287f25f5789761de5ae44c9e71e77a70b61d4acc47fa66b041dbf8650c1cf
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