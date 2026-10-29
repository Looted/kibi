---
title: A superseded firm decision shall be reported as decision-firm-superseded, by a regex proof
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
    - symbol_id: SYM-proof-rule-decision-firm-superseded
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-decision-firmness-firm-superseded-rule
  proves:
    - CLAIM-CC13364AF3CAE168
origin:
  kind: agent
  recorded_at: '2026-10-29T16:39:13.262Z'
id: TEST-proof-rule-decision-firm-superseded
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2a819dfbb5c849dce814057e
    test_id: TEST-proof-rule-decision-firm-superseded
    scope: unit
    outcome: passed
    code_snapshot: a29ab0b7ed18b6a171a62094b8cf21f0c4a2013eca287583b5dc35ba5bd319c0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:32:33.274Z'
    finished_at: '2026-10-29T17:32:33.544Z'
    artifact_digest: fb5729b9252e2c2edcc36ba56b41b32b4426e9d28c9b3e7fb291676355f2a63d
    contract_hash: 27bf7172f0493e755a93d30966ca161646b5dab5e445ef033bc3693d02348206
    binding_hash: 7b30a22df39aef4972fd4c3f01d5ed2b2f5396da94363a2a19c7832585b77d6e
    fingerprint: 11d3940a48b97ec1f45fe423c4fbab21806883fbf273755bf7a9b7174e5b126c
    fingerprint_components:
      contract: 27bf7172f0493e755a93d30966ca161646b5dab5e445ef033bc3693d02348206
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
      - symbol_id: SYM-proof-rule-decision-firm-superseded
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
      test_id: TEST-proof-rule-decision-firm-superseded
      pattern:
        symbol_id: SYM-decision-firmness-firm-superseded-rule
        type: string
        value: decision-firm-superseded
    certificate_digest: 80c6ab893d06c748f4512ab61f71ecc978b83f743a234d0f1b8f43d2e4fda6f3
    claim_bindings:
      - claim_key: CLAIM-CC13364AF3CAE168
        requirement_id: REQ-kb-decision-firmness-rule-names
        fact_id: FACT-rule-decision-firm-superseded
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: decision-firm-superseded
---
Proves that a superseded firm decision shall be reported as decision-firm-superseded, against the code Kibi reads at ingest.