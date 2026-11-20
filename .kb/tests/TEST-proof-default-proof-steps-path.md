---
title: The default proof steps source shall be the proof/steps directory, by a regex proof
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
    - symbol_id: SYM-proof-default-proof-steps-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-default-proof-steps-dir
  proves:
    - CLAIM-435BE68CBC8205AD
origin:
  kind: agent
  recorded_at: '2026-10-28T11:06:48.369Z'
id: TEST-proof-default-proof-steps-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f887776806d94c0d72b9fbf6
    test_id: TEST-proof-default-proof-steps-path
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 98e489efc8d7289d0cceb9b307bd85e189cd31ab3b996dd2b47c5aca17a4ad34
    binding_hash: 3d2338e769a9bf575f985f3b1b6a41cd87ad153f65c6aac6f1c40f28498cd7fe
    fingerprint: 464e51802a6895a37ce730cd15009937cbcdbe44d7381b69893b840e1b1c6e93
    fingerprint_components:
      contract: 98e489efc8d7289d0cceb9b307bd85e189cd31ab3b996dd2b47c5aca17a4ad34
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
      - symbol_id: SYM-proof-default-proof-steps-path
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
      test_id: TEST-proof-default-proof-steps-path
      pattern:
        symbol_id: SYM-const-default-proof-steps-dir
        type: string
        value: proof/steps
    certificate_digest: e6fe93c528b416fdebaf4561d249199e1ca622411360d4d2d0d7f94e25b8bd18
    claim_bindings:
      - claim_key: CLAIM-435BE68CBC8205AD
        requirement_id: REQ-kibi-proof-step-settings
        fact_id: FACT-default-proof-steps-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: proof/steps
---
Proves that the default proof steps file shall be proof/steps.json, against the code Kibi reads at ingest.