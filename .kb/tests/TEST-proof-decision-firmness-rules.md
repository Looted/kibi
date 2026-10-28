---
title: The decision firmness rules shall be decision-firm-unreferenced, decision-firm-superseded, decision-firm-edited, supersedes-reason-missing and supersedes-reason-acknowledged, by an exhaustive proof
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
    - symbol_id: SYM-proof-decision-firmness-rules
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-decision-firmness-rules
  proves:
    - CLAIM-502D34B19FE18089
origin:
  kind: agent
  recorded_at: '2026-10-28T11:02:47.235Z'
id: TEST-proof-decision-firmness-rules
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-73b5eee5e02beb909b118a6a
    test_id: TEST-proof-decision-firmness-rules
    scope: unit
    outcome: passed
    code_snapshot: 8f943f21fb235bc55121047965e970d19b2358702a2524537fc13cc25d316246
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:04:10.741Z'
    finished_at: '2026-10-28T11:04:10.954Z'
    artifact_digest: 789e09d98276fe7301f3125273662cdf5dda7a1d5838db30419a0ec70fec56be
    contract_hash: a6aa64d165e04cdf45a4f4b9c1cc959eb28b5c0802cafa2f634037960d6833bd
    binding_hash: 16e31dfa389e0f899d57e2b61bb7fc8af8b95aaefbaf06f74b0936c158cdc4a6
    fingerprint: ad844c0befd6cb2ab5074426d7a29c36b71f63e5bf91c6ca554b432fad45e754
    fingerprint_components:
      contract: a6aa64d165e04cdf45a4f4b9c1cc959eb28b5c0802cafa2f634037960d6833bd
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
      - symbol_id: SYM-proof-decision-firmness-rules
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
      test_id: TEST-proof-decision-firmness-rules
      domain:
        symbol_id: SYM-decision-firmness-rules
        members:
          - decision-firm-unreferenced
          - decision-firm-superseded
          - decision-firm-edited
          - supersedes-reason-missing
          - supersedes-reason-acknowledged
      results:
        - member: decision-firm-unreferenced
          outcome: passed
        - member: decision-firm-superseded
          outcome: passed
        - member: decision-firm-edited
          outcome: passed
        - member: supersedes-reason-missing
          outcome: passed
        - member: supersedes-reason-acknowledged
          outcome: passed
    certificate_digest: 4f1e2f2cbadef1b4f773c7d9d966e96bdbe27f9f87417f965bb41a6a3c1ee3dd
    claim_bindings:
      - claim_key: CLAIM-502D34B19FE18089
        requirement_id: REQ-kb-decision-firmness-rule-ids
        fact_id: FACT-decision-firmness-rules
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - decision-firm-edited
            - decision-firm-superseded
            - decision-firm-unreferenced
            - supersedes-reason-acknowledged
            - supersedes-reason-missing
---
Proves that the decision firmness rules shall be decision-firm-unreferenced, decision-firm-superseded, decision-firm-edited, supersedes-reason-missing and supersedes-reason-acknowledged, against the code Kibi reads at ingest.