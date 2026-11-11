---
title: A superseded requirement shall close with status closed, by a regex proof
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
    - symbol_id: SYM-proof-closed-requirement-status
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-closed-requirement-status
  proves:
    - CLAIM-DD9D88701148517A
origin:
  kind: agent
  recorded_at: '2026-10-28T20:33:39.460Z'
id: TEST-proof-closed-requirement-status
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7bf4aeb90c581d027502d6fb
    test_id: TEST-proof-closed-requirement-status
    scope: unit
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:30:08.112Z'
    finished_at: '2026-11-04T18:30:08.254Z'
    artifact_digest: 81ba2f59ea98dfcf33f29793083bf721403c8b01533304618d66e2a348cd46c2
    contract_hash: 1c221425b531f2bc0c0476ad8d60bff704b4c2589e857219a0dd90aa517419a4
    binding_hash: 5e91ac0957bd40241257a362057f944e248d1b842eaab6234c1afb442c5c30f5
    fingerprint: 175884d2a066bed1a9e6f0067c7285b58a88f934174323665f97859d65f1c52c
    fingerprint_components:
      contract: 1c221425b531f2bc0c0476ad8d60bff704b4c2589e857219a0dd90aa517419a4
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
      - symbol_id: SYM-proof-closed-requirement-status
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
      test_id: TEST-proof-closed-requirement-status
      pattern:
        symbol_id: SYM-const-closed-requirement-status
        type: string
        value: closed
    certificate_digest: 226cc6702e08f7acc0681e859ad2e16cf87c46fede5a5276caf9418bf85f790d
    claim_bindings:
      - claim_key: CLAIM-DD9D88701148517A
        requirement_id: REQ-cli-migration-supersession-codes
        fact_id: FACT-closed-requirement-status
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: closed
---
Proves that a superseded requirement shall close with status closed, against the code Kibi reads at ingest.