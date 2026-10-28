---
title: The default proof steps file shall be proof/steps.json, by a regex proof
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
    symbol_id: SYM-const-default-proof-steps-path
  proves:
    - CLAIM-9C090DC61B833364
origin:
  kind: agent
  recorded_at: '2026-10-28T11:06:48.369Z'
id: TEST-proof-default-proof-steps-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dcc6e660cc59f460702ba11c
    test_id: TEST-proof-default-proof-steps-path
    scope: unit
    outcome: passed
    code_snapshot: ebc106e5d7924a9ee2a860dfc5601c8f8311531c6d560d6647b330d4db83fd82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:09:34.397Z'
    finished_at: '2026-10-28T11:09:34.508Z'
    artifact_digest: c749df7138073d441e2f0cbc83e234913fcadea39d2f64fc3d24e7f33c8905e8
    contract_hash: 7d8520840bfc6fe16c2a3e4537dfc62d2928250c47cd7fa7d2a3ab188db04f96
    binding_hash: b62c77be6f518276fa0d6bda936bc67e29133ffe956903a68e708e722d69203e
    fingerprint: 314ce640a824e794b9b6de831c800273585bf854bfbbfb9f8fb61bc701186c67
    fingerprint_components:
      contract: 7d8520840bfc6fe16c2a3e4537dfc62d2928250c47cd7fa7d2a3ab188db04f96
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
        symbol_id: SYM-const-default-proof-steps-path
        type: string
        value: proof/steps.json
    certificate_digest: 170f367374fe74bfab1db4d2b69caa4ef9f9736182170086824f21e6adf230ed
    claim_bindings:
      - claim_key: CLAIM-9C090DC61B833364
        requirement_id: REQ-kibi-proof-step-settings
        fact_id: FACT-default-proof-steps-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: proof/steps.json
---
Proves that the default proof steps file shall be proof/steps.json, against the code Kibi reads at ingest.