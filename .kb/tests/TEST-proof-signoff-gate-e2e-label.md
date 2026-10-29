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
    receipt_id: PR-c1209039e39ff7111c15421a
    test_id: TEST-proof-signoff-gate-e2e-label
    scope: unit
    outcome: passed
    code_snapshot: ae80779d8bd151a480cd15de82d5463751f28e41804143ed52280230999e584f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:26:56.758Z'
    finished_at: '2026-10-28T22:26:56.868Z'
    artifact_digest: cfa9ae2d306da2258a634fce5e286296caf506dc2136737d107c77786a79ae2a
    contract_hash: 71d727bb0084b86cf1ebb0c9ccb1eb3c0cdb08ab00e7db9fc18b247351f198f0
    binding_hash: 2ce482906ca4b31fe17511b0bcd7bab1c7fbdd730e484c8fd8df986c2658df12
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