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
    receipt_id: PR-da8bf47391501132e8b65a19
    test_id: TEST-proof-signoff-gate-scenario-label
    scope: unit
    outcome: passed
    code_snapshot: ae80779d8bd151a480cd15de82d5463751f28e41804143ed52280230999e584f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:26:46.090Z'
    finished_at: '2026-10-28T22:26:46.186Z'
    artifact_digest: 30e4f07a556cc03eb44c300a4385c94412349e8ecd38a6beddb02e9e119da7aa
    contract_hash: fc4b25417ee49101958ff8995fac7b61b0219e535810855db3ab4818eba35503
    binding_hash: 0ff2f7d5f8e2e7dc0c48cc3df9512924bfbe969963806544864e40ea600801c7
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