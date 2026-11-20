---
title: The signoff label of the scenario gate shall be no scenario yet, by a regex proof
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
    - symbol_id: SYM-proof-signoff-gate-scenario-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-gate-labels
    export: SIGNOFF_GATE_LABELS.scenario
  proves:
    - CLAIM-E35356B617F26B36
origin:
  kind: agent
  recorded_at: '2026-10-28T22:22:40.309Z'
id: TEST-proof-signoff-gate-scenario-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1808c5ed4c31bf20cc43f474
    test_id: TEST-proof-signoff-gate-scenario-label
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: fc4b25417ee49101958ff8995fac7b61b0219e535810855db3ab4818eba35503
    binding_hash: b2c4084b10d43b553bf2e211f0a32f46479994d931ed03128988ab5a66ca03ac
    fingerprint: af08c52b2169fc3331a4526398ae9d0919fec0f74df79b6c63c78b18c4fc6bf7
    fingerprint_components:
      contract: fc4b25417ee49101958ff8995fac7b61b0219e535810855db3ab4818eba35503
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
      - symbol_id: SYM-proof-signoff-gate-scenario-label
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
      test_id: TEST-proof-signoff-gate-scenario-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-gate-labels
        type: string
        value: no scenario yet
    certificate_digest: 1159e49e2474505b98fcef6a813908219300332e2a779204f0d3ba471c3e08f2
    claim_bindings:
      - claim_key: CLAIM-E35356B617F26B36
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-gate-scenario-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: no scenario yet
---
Proves that the signoff label of the scenario gate shall be no scenario yet, against the code Kibi reads at ingest.