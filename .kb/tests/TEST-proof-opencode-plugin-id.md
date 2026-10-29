---
title: The OpenCode plugin id shall be kibi-opencode, by a regex proof
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
    - symbol_id: SYM-proof-opencode-plugin-id
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-kibi-opencode-plugin-id
  proves:
    - CLAIM-E677C39A65904A11
origin:
  kind: agent
  recorded_at: '2026-10-29T17:01:59.678Z'
id: TEST-proof-opencode-plugin-id
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ee94af1188bd500f1c0f3eb8
    test_id: TEST-proof-opencode-plugin-id
    scope: unit
    outcome: passed
    code_snapshot: 10a72d3ea173ef395ace4a6d542790685d0190f95e2ea21d4d55876e045cc73e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:05:02.767Z'
    finished_at: '2026-10-29T17:05:02.943Z'
    artifact_digest: 5a978b4047211b526330e393633106c574776521cd9b8b548d53f96d909d6409
    contract_hash: e881a33007ca90a7cb7f0e47848eeca7d02c2bef0ac95012160b513a71b8690e
    binding_hash: b2310514eda9fcc1b115ae30f5f3abe3886c5139c5b52383bb33bdab74af3ebf
    fingerprint: e3aa984b62bf37c9e90dba6a58c9e57958eb0685e6293637faaef6d9a4b6c12a
    fingerprint_components:
      contract: e881a33007ca90a7cb7f0e47848eeca7d02c2bef0ac95012160b513a71b8690e
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
      - symbol_id: SYM-proof-opencode-plugin-id
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
      test_id: TEST-proof-opencode-plugin-id
      pattern:
        symbol_id: SYM-const-kibi-opencode-plugin-id
        type: string
        value: kibi-opencode
    certificate_digest: 355cdad45b4afe61e3a85b20738afc4e5b5caa580cef670067f665d3b289bd5d
    claim_bindings:
      - claim_key: CLAIM-E677C39A65904A11
        requirement_id: REQ-opencode-plugin-ids
        fact_id: FACT-opencode-plugin-id
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi-opencode
---
Proves that the OpenCode plugin id shall be kibi-opencode, against the code Kibi reads at ingest.