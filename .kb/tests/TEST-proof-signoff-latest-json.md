---
title: The latest Kibi signoff JSON view file shall be .kb/briefs/signoff/latest.json, by a regex proof
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
    - symbol_id: SYM-proof-signoff-latest-json
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  proves:
    - CLAIM-E4E917F697A7045C
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-latest-json
origin:
  kind: agent
  recorded_at: '2026-10-30T19:41:03.061Z'
id: TEST-proof-signoff-latest-json
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7c263e5b74cbbff36933e954
    test_id: TEST-proof-signoff-latest-json
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:45:41.193Z'
    finished_at: '2026-10-30T19:45:41.299Z'
    artifact_digest: ac22d12fa5ae0b3c098eb18bc1274d83dd1c294b121dddb0aaa8ded987adc21c
    contract_hash: 1aef053b69f70eb901ddabcb4bdd527046ea219061c4c142198022e278312c41
    binding_hash: 03e4b8777c376868679cd74dfb9dd68aa3b1735068d4cf3fe8058cf57037c1fd
    fingerprint: 18f3ad03bbfdf78a0f2681148d1e6aef8685b428adffc95cb5def43749850eba
    fingerprint_components:
      contract: 1aef053b69f70eb901ddabcb4bdd527046ea219061c4c142198022e278312c41
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
      - symbol_id: SYM-proof-signoff-latest-json
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
      test_id: TEST-proof-signoff-latest-json
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-latest-json
        type: string
        value: .kb/briefs/signoff/latest.json
    certificate_digest: 1312f0f797e2257043b35cc1f4137062056246782c318bfed880b834a1284165
    claim_bindings:
      - claim_key: CLAIM-E4E917F697A7045C
        requirement_id: REQ-signoff-latest-views
        fact_id: FACT-signoff-latest-json
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/briefs/signoff/latest.json
---
Proves that the latest Kibi signoff JSON view file shall be .kb/briefs/signoff/latest.json, against the code Kibi reads at ingest.