---
title: The placeholder repository owner shall be OWNER, by a regex proof
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
    - symbol_id: SYM-proof-github-placeholder-owner
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-github-placeholder-owner
  proves:
    - CLAIM-BA364427D4A651C8
origin:
  kind: agent
  recorded_at: '2026-10-29T10:20:22.867Z'
id: TEST-proof-github-placeholder-owner
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-89f88d499ad5cb925130e3e3
    test_id: TEST-proof-github-placeholder-owner
    scope: unit
    outcome: passed
    code_snapshot: 7f5f3cbf07bcd668a6ba1d822ce431959e51a6f2bdc18ca3aef8600b71016261
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:24:17.448Z'
    finished_at: '2026-10-29T10:24:17.606Z'
    artifact_digest: d8db2216be8ed328b5f0ed18507f2635b5cffcbeaebb773e86c6eb26f49e6545
    contract_hash: 78a33649190f8305341923cc92bdadbf88b08754e85a342ecd85ba6342e36c66
    binding_hash: feb7aa13ef8c8a4fc4129b6fc176ca47ed3787474e7861142c8bb8e5a247ce6a
    fingerprint: fc521e033e4aa67a80a310b23d35aa57b5e2c0cf7ca7dad1e041bc5d24abf748
    fingerprint_components:
      contract: 78a33649190f8305341923cc92bdadbf88b08754e85a342ecd85ba6342e36c66
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
      - symbol_id: SYM-proof-github-placeholder-owner
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
      test_id: TEST-proof-github-placeholder-owner
      pattern:
        symbol_id: SYM-cli-github-placeholder-owner
        type: string
        value: OWNER
    certificate_digest: 45bfb977fa6b9303281ea69e210157a39ed46b9344b364bb430ccfb6caa5d340
    claim_bindings:
      - claim_key: CLAIM-BA364427D4A651C8
        requirement_id: REQ-kibi-github-report-settings
        fact_id: FACT-github-placeholder-owner
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: OWNER
---
Proves that the placeholder repository owner shall be OWNER, against the code Kibi reads at ingest.