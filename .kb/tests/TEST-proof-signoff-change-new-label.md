---
title: The signoff label of a new change shall be New, by a regex proof
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
    - symbol_id: SYM-proof-signoff-change-new-label
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-change-labels
    export: SIGNOFF_CHANGE_LABELS.new
  proves:
    - CLAIM-A60DF82872D0C155
origin:
  kind: agent
  recorded_at: '2026-10-28T22:24:14.557Z'
id: TEST-proof-signoff-change-new-label
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-576bb527bd54ec5043ff977d
    test_id: TEST-proof-signoff-change-new-label
    scope: unit
    outcome: passed
    code_snapshot: ae80779d8bd151a480cd15de82d5463751f28e41804143ed52280230999e584f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:27:12.591Z'
    finished_at: '2026-10-28T22:27:12.677Z'
    artifact_digest: 8e28143448f746ad7ffac61261035e3c36893dbd1db3f0672bc13e05ddac1882
    contract_hash: 1d895ddbda624b08d4d887aacc772df2bd655bf875c321f810184af792fb1578
    binding_hash: cbffc6bca200eb511031db44c2145de50028c2df25ff2e7a6a22ff87b9946fcc
    fingerprint: 62407b1ea210c501e537de0039dab807f2f07c7c22974b5a676a960d87c566c6
    fingerprint_components:
      contract: 1d895ddbda624b08d4d887aacc772df2bd655bf875c321f810184af792fb1578
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
      - symbol_id: SYM-proof-signoff-change-new-label
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
      test_id: TEST-proof-signoff-change-new-label
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-change-labels
        type: string
        value: New
    certificate_digest: ec3a562305f3a95e03e950ead61cb3671f22f1111b0ae1eacfcaed9d4fc6871b
    claim_bindings:
      - claim_key: CLAIM-A60DF82872D0C155
        requirement_id: REQ-kibi-signoff-labels
        fact_id: FACT-signoff-change-new-label
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: New
---
Proves that the signoff label of a new change shall be New, against the code Kibi reads at ingest.