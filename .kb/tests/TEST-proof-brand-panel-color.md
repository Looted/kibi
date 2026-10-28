---
title: 'The Kibi panel brand colour shall be #191c22, by a regex proof'
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
    - symbol_id: SYM-proof-brand-panel-color
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-report-brand-tokens
    export: KIBI_BRAND.panel
  proves:
    - CLAIM-EADEA4998EA62007
origin:
  kind: agent
  recorded_at: '2026-10-28T22:28:43.147Z'
id: TEST-proof-brand-panel-color
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dc411e4f7a259e0bad19e468
    test_id: TEST-proof-brand-panel-color
    scope: unit
    outcome: passed
    code_snapshot: 0a46a168f79f32c7067fd54b62e7bfea277eb1d3f88ddceab97c98613f8e5f74
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:32:33.885Z'
    finished_at: '2026-10-28T22:32:33.977Z'
    artifact_digest: d056fc2bf6e87913761e1686335899349381a1b18844565d9301f34fecbff6e7
    contract_hash: 9beebc3be4f3f99307ed6912694483e59524161dc0fffd007a1a25f5ffa2c79d
    binding_hash: 6ef46e0e711c50ebe5cd19ae179b13203529294fcb244f1dc6bcafeef05529c9
    fingerprint: afc46bbfabe52b9d16aba49b0c140a559ea6bd991f86fd0a91d11109343ec938
    fingerprint_components:
      contract: 9beebc3be4f3f99307ed6912694483e59524161dc0fffd007a1a25f5ffa2c79d
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
      - symbol_id: SYM-proof-brand-panel-color
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
      test_id: TEST-proof-brand-panel-color
      pattern:
        symbol_id: SYM-cli-report-brand-tokens
        type: string
        value: '#191c22'
    certificate_digest: 80fcdfb0d464b631a409a1ab280a8d6a677afba6e542266d7533bfd31e8be81f
    claim_bindings:
      - claim_key: CLAIM-EADEA4998EA62007
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-panel-color
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: '#191c22'
---
Proves that the Kibi panel brand colour shall be #191c22, against the code Kibi reads at ingest.