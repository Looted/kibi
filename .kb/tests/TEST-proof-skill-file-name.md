---
title: A skill file shall be named SKILL.md, by a regex proof
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
    - symbol_id: SYM-proof-skill-file-name
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-SKILL_FILE_NAME
  proves:
    - CLAIM-C0A950028A3B82F5
origin:
  kind: agent
  recorded_at: '2026-10-28T19:13:05.170Z'
id: TEST-proof-skill-file-name
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fc740e7edb36d1a1be6325b3
    test_id: TEST-proof-skill-file-name
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 6a1cd96597fc84a6070668f1c28a482ce6ddf37bc5a5f492160c08845db5122d
    binding_hash: a483a95cd3c34ee0a2bbf31fe754b147619eb13232d61066a9b954bf38248d9f
    fingerprint: f869515bc5686753a44963afb9d21fb38f6b87358ee7548951ffdd86c040659f
    fingerprint_components:
      contract: 6a1cd96597fc84a6070668f1c28a482ce6ddf37bc5a5f492160c08845db5122d
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
      - symbol_id: SYM-proof-skill-file-name
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
      test_id: TEST-proof-skill-file-name
      pattern:
        symbol_id: SYM-SKILL_FILE_NAME
        type: string
        value: SKILL.md
    certificate_digest: 79122c98ed9f0ded610ed9c9eb5cb77fd63fde7ab8e64c60d35b3920a37b539a
    claim_bindings:
      - claim_key: CLAIM-C0A950028A3B82F5
        requirement_id: REQ-skill-file-limits
        fact_id: FACT-skill-file-name
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: SKILL.md
---
Proves that a skill file shall be named SKILL.md, against the code Kibi reads at ingest.