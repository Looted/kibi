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
    receipt_id: PR-fa3226b8ab22486f9cfed78d
    test_id: TEST-proof-decision-firmness-rules
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a6aa64d165e04cdf45a4f4b9c1cc959eb28b5c0802cafa2f634037960d6833bd
    binding_hash: 3f1c15cf254e570af4e8b43a3d0b79cc8471ec552a31bb7e697e773cd495e474
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