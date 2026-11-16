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
    receipt_id: PR-f1a13b7634edd33dc1e97d21
    test_id: TEST-proof-default-proof-steps-path
    scope: unit
    outcome: passed
    code_snapshot: d699a078fe8d2323d221f435a979d519f5acca43cfee14f7307e23c39a35f0fa
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T21:01:15.332Z'
    finished_at: '2026-11-16T21:01:34.441Z'
    artifact_digest: 3ef1b1564e3821c2d1f507334af153c4831866821439fdb98ef86c918ef3be6e
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