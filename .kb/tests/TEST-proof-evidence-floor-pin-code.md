---
title: The evidence floor pin code shall be evidence_floor_pin, by a regex proof
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
    - symbol_id: SYM-proof-evidence-floor-pin-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-evidence-floor-pin-code
  proves:
    - CLAIM-9EFFBF69BC9516AC
origin:
  kind: agent
  recorded_at: '2026-10-28T20:30:39.773Z'
id: TEST-proof-evidence-floor-pin-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f48a7e80cbaef9cdf5193572
    test_id: TEST-proof-evidence-floor-pin-code
    scope: unit
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:30:18.249Z'
    finished_at: '2026-11-04T18:30:18.396Z'
    artifact_digest: ed5c8a8b203e3ad2ac50f63f6919d6863331cb9f12c6ea8ca4cbaea39cbb3202
    contract_hash: 94970897e5566ef89223fe959d50e7600e8d6684c8a61397a17b93cbf82738cb
    binding_hash: 5a4930e918745d9df51eb43edbf529f9966c14873906dfb032392c435fd0882f
    fingerprint: 9d4860dca532029698c8670246bbababbcd5251eb7279ffa456bc070ddf4539c
    fingerprint_components:
      contract: 94970897e5566ef89223fe959d50e7600e8d6684c8a61397a17b93cbf82738cb
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
      - symbol_id: SYM-proof-evidence-floor-pin-code
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
      test_id: TEST-proof-evidence-floor-pin-code
      pattern:
        symbol_id: SYM-const-evidence-floor-pin-code
        type: string
        value: evidence_floor_pin
    certificate_digest: 922863de318c16485177804d9c4659e4cbcb2e8f0123d6baf1f56c51851ff896
    claim_bindings:
      - claim_key: CLAIM-9EFFBF69BC9516AC
        requirement_id: REQ-cli-migration-proof-codes
        fact_id: FACT-evidence-floor-pin-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: evidence_floor_pin
---
Proves that the evidence floor pin code shall be evidence_floor_pin, against the code Kibi reads at ingest.