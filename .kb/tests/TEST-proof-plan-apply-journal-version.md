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
    receipt_id: PR-82b53e5369e9409b0cfbd140
    test_id: TEST-proof-plan-apply-journal-version
    scope: unit
    outcome: passed
    code_snapshot: aedbf61b090ddd932407b1f24b5d23882f2656daaf0e8c6ef5287f2a93d22141
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T21:00:08.461Z'
    finished_at: '2026-10-28T21:00:08.606Z'
    artifact_digest: be1f0b00e0f5d35dbc68de645ee8a27a51fb896e4ae35806637c89635c828878
    contract_hash: 4f5425be52867ebddc4941d00824d6eac14aaac37bebba98d67b0d0a10a6477d
    binding_hash: 9ee4d9b246301ea9825d37ca765a2c2bd7084865ee21ab8e81dbca026566ceaf
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