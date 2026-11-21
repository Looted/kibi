---
title: The plan apply journal version shall be kibi.plan-apply-journal.v1, by a regex proof
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
    - symbol_id: SYM-proof-plan-apply-journal-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-plan-apply-journal-version
  proves:
    - CLAIM-FE61593D07862163
origin:
  kind: agent
  recorded_at: '2026-10-28T20:58:40.802Z'
id: TEST-proof-plan-apply-journal-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-177bb1bf2540ed2abd7f02ac
    test_id: TEST-proof-plan-apply-journal-version
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 4f5425be52867ebddc4941d00824d6eac14aaac37bebba98d67b0d0a10a6477d
    binding_hash: 3fe94643010a6d710ecc06db846c3dc7c4a8e78de3bf2584669ef959f7e30439
    fingerprint: 367c7a17e7e6ba83d6dbe74ee37226f979ec1fe0954119b315203f85358f211f
    fingerprint_components:
      contract: 4f5425be52867ebddc4941d00824d6eac14aaac37bebba98d67b0d0a10a6477d
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
      - symbol_id: SYM-proof-plan-apply-journal-version
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
      test_id: TEST-proof-plan-apply-journal-version
      pattern:
        symbol_id: SYM-const-plan-apply-journal-version
        type: string
        value: kibi.plan-apply-journal.v1
    certificate_digest: 71898d6aa99571ef9add30f637b1a887b098ee70d55d33f3b7bdc4f25a975a6a
    claim_bindings:
      - claim_key: CLAIM-FE61593D07862163
        requirement_id: REQ-kibi-plan-apply-journal-version
        fact_id: FACT-plan-apply-journal-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.plan-apply-journal.v1
---
Proves that the plan apply journal version shall be kibi.plan-apply-journal.v1, against the code Kibi reads at ingest.