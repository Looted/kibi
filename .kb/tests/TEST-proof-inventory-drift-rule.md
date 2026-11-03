---
title: The staged inventory drift rule shall be semantic-inventory-drift, by a regex proof
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
    - symbol_id: SYM-proof-inventory-drift-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-staged-inventory-drift-STAGED_INVENTORY_DRIFT_RULE
  proves:
    - CLAIM-6DAA24F8B83DBF44
origin:
  kind: agent
  recorded_at: '2026-10-28T19:05:42.837Z'
id: TEST-proof-inventory-drift-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dc28f7145fc1dfbadc45d2b4
    test_id: TEST-proof-inventory-drift-rule
    scope: unit
    outcome: passed
    code_snapshot: df3286680d86baf1d58f9da1509cadbfec13659d696c7a2fa63220020f268bb5
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-03T10:58:33.597Z'
    finished_at: '2026-11-03T10:58:33.804Z'
    artifact_digest: c507b0eb1aae9c558b64673f4d0149ebc83a9c12bd283c7e7177264e7b30d550
    contract_hash: 1b887ceb14a6045ff8b5c31d55475c52ae4b6440267c950a58239d2cdddea378
    binding_hash: 5c68c8f4665faa07819709dd1243cabe7f77f7b9296b4324029fa2d15725f8e1
    fingerprint: 92b7de767d548e30b88425ec16af6d6224df5d3a88f102f01b09a89f72f44448
    fingerprint_components:
      contract: 1b887ceb14a6045ff8b5c31d55475c52ae4b6440267c950a58239d2cdddea378
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
      - symbol_id: SYM-proof-inventory-drift-rule
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
      test_id: TEST-proof-inventory-drift-rule
      pattern:
        symbol_id: SYM-staged-inventory-drift-STAGED_INVENTORY_DRIFT_RULE
        type: string
        value: semantic-inventory-drift
    certificate_digest: 71c4c40e6641f207e428e64b073f7d8d7fc8df8badcb348da504e2cd43317e44
    claim_bindings:
      - claim_key: CLAIM-6DAA24F8B83DBF44
        requirement_id: REQ-ingestion-inventory-settings
        fact_id: FACT-inventory-drift-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: semantic-inventory-drift
---
Proves that the staged inventory drift rule shall be semantic-inventory-drift, against the code Kibi reads at ingest.