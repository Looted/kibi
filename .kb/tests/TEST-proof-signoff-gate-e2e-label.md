---
title: The signoff label of the e2e gate shall be no end-to-end test yet, by a regex proof
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
    - symbol_id: SYM-proof-signoff-gate-e2e-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-gate-labels
    export: SIGNOFF_GATE_LABELS.e2e
  proves:
    - CLAIM-91CB54BAA02C246A
origin:
  kind: agent
  recorded_at: '2026-10-28T22:23:18.289Z'
id: TEST-proof-signoff-gate-e2e-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7897d5faa9da26094a4081a8
    test_id: TEST-proof-signoff-gate-e2e-label
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 71d727bb0084b86cf1ebb0c9ccb1eb3c0cdb08ab00e7db9fc18b247351f198f0
    binding_hash: 828497f1e45ba20acf6287e9ef590a1a687acf115f2606386d3a4bb6797210e3
    fingerprint: 5fa53d07041bb7d1d1b04d2d88a615d8e69592adb4d051f02e19afc41973d9c1
    fingerprint_components:
      contract: 71d727bb0084b86cf1ebb0c9ccb1eb3c0cdb08ab00e7db9fc18b247351f198f0
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
      - symbol_id: SYM-proof-signoff-gate-e2e-label
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
      test_id: TEST-proof-signoff-gate-e2e-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-gate-labels
        type: string
        value: no end-to-end test yet
    certificate_digest: 430d50422f5e0379ed66e23bd3a3fb5527d87e0fba812ee11560508529b2a32a
    claim_bindings:
      - claim_key: CLAIM-91CB54BAA02C246A
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-gate-e2e-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: no end-to-end test yet
---
Proves that the signoff label of the e2e gate shall be no end-to-end test yet, against the code Kibi reads at ingest.