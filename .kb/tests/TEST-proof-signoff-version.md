---
title: The Kibi signoff version shall be kibi.signoff.v1, by a regex proof
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
    - symbol_id: SYM-proof-signoff-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-signoff-model-signoff-version
  proves:
    - CLAIM-D7B7229A0D10B31B
origin:
  kind: agent
  recorded_at: '2026-10-28T17:53:19.448Z'
id: TEST-proof-signoff-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4b2dcc62e75c12de989a5aed
    test_id: TEST-proof-signoff-version
    scope: unit
    outcome: passed
    code_snapshot: f56d02d37c76056d276c0259b6964b32439ee7a792b58208479bdda5fb247e39
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:54:54.795Z'
    finished_at: '2026-10-28T17:54:54.908Z'
    artifact_digest: b854a649ca3187250e524b065b8487ef96b7bf9a730c3caa31df22a852bc7aa6
    contract_hash: b741bea909c1a6c31755732dfcb571e0cc89d53dd5606f118bf851e8d55e956f
    binding_hash: 058253a370b024554b9165fd94f2a296664c43513063e309c3dfe29e7a9b62f3
    fingerprint: d304881d77aa33ee292f9bbb3e720769f876d3b4a29a5fb42ebb84e1a99853f1
    fingerprint_components:
      contract: b741bea909c1a6c31755732dfcb571e0cc89d53dd5606f118bf851e8d55e956f
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
      - symbol_id: SYM-proof-signoff-version
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
      test_id: TEST-proof-signoff-version
      pattern:
        symbol_id: SYM-cli-signoff-model-signoff-version
        type: string
        value: kibi.signoff.v1
    certificate_digest: 75f2529d2cd71b9f9e8e1438251f902c24d98770c752337cbba8cff60ad154b6
    claim_bindings:
      - claim_key: CLAIM-D7B7229A0D10B31B
        requirement_id: REQ-kibi-signoff-version
        fact_id: FACT-signoff-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.signoff.v1
---
Proves that the Kibi signoff version shall be kibi.signoff.v1, against the code Kibi reads at ingest.