---
title: The kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT, by a regex proof
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
    - symbol_id: SYM-proof-signoff-format-env
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-signoff-format-env
  proves:
    - CLAIM-1B36DD238864E38E
origin:
  kind: agent
  recorded_at: '2026-10-28T11:16:45.170Z'
id: TEST-proof-signoff-format-env
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7c61f0fea083f26a2f405985
    test_id: TEST-proof-signoff-format-env
    scope: unit
    outcome: passed
    code_snapshot: ccdea2974dcdded674ee350fe5c87cf96382361e8b7009a6573bea25829d6148
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:18:23.166Z'
    finished_at: '2026-10-28T11:18:23.346Z'
    artifact_digest: bcc335ee5faf96075c7d7bc468f4e3e3016d155b2e1900530509823bcc9506f4
    contract_hash: 85cb09d525f1d661fd3cee19c3509f7c1f7dd149500f42863e229fe0db3d0092
    binding_hash: 3d05a059e0041a4066d340d4a7c482282ba9e8f01a7094e929b0bf6f3210e0b9
    fingerprint: 1c37c5169844aacbf0a0c15cb9890396a5a87a9d44e840de0c7b9a9e43d33658
    fingerprint_components:
      contract: 85cb09d525f1d661fd3cee19c3509f7c1f7dd149500f42863e229fe0db3d0092
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
      - symbol_id: SYM-proof-signoff-format-env
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
      test_id: TEST-proof-signoff-format-env
      pattern:
        symbol_id: SYM-cli-signoff-signoff-format-env
        type: string
        value: KIBI_SIGNOFF_FORMAT
    certificate_digest: 39079dd80217b5f549418bb4d2b2b92c5424d20207f402aa4cf04a07fe3a411a
    claim_bindings:
      - claim_key: CLAIM-1B36DD238864E38E
        requirement_id: REQ-kibi-signoff-format-setting
        fact_id: FACT-signoff-format-env
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: KIBI_SIGNOFF_FORMAT
---
Proves that the kibi signoff format environment variable shall be KIBI_SIGNOFF_FORMAT, against the code Kibi reads at ingest.