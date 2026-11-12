---
title: The legacy symbol link mark code shall be symbol_legacy_link_mark, by a regex proof
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
    - symbol_id: SYM-proof-legacy-link-mark-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-symbol-legacy-link-mark-code
  proves:
    - CLAIM-8265F23C3E6C3DC2
origin:
  kind: agent
  recorded_at: '2026-10-28T20:33:15.650Z'
id: TEST-proof-legacy-link-mark-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b2720d1a0fac25abbeef3680
    test_id: TEST-proof-legacy-link-mark-code
    scope: unit
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:30:28.857Z'
    finished_at: '2026-11-04T18:30:29.004Z'
    artifact_digest: e499ce9e7bebaac472e150817c17c39c2e2cef59eb4d04e0e29fa2306792f0cc
    contract_hash: ef53a03faa9b72f2d8b6a0684fc0a73f42cc68814103ff7c6093be9e8a524296
    binding_hash: 470c142ae3811bb6203bb9ab63da087d592a8e3fd9d9e0b0cf6aa44a5dfb3070
    fingerprint: d85bf6e439b968016061291e45e2bf12aa4c77a8d0c0cce62a138aeb67d6bea2
    fingerprint_components:
      contract: ef53a03faa9b72f2d8b6a0684fc0a73f42cc68814103ff7c6093be9e8a524296
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
      - symbol_id: SYM-proof-legacy-link-mark-code
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
      test_id: TEST-proof-legacy-link-mark-code
      pattern:
        symbol_id: SYM-const-symbol-legacy-link-mark-code
        type: string
        value: symbol_legacy_link_mark
    certificate_digest: fc22b9ea35f029dc38262a7a612d6c5faa2ac84d7300fbe5e6273b87101c1552
    claim_bindings:
      - claim_key: CLAIM-8265F23C3E6C3DC2
        requirement_id: REQ-cli-migration-symbol-codes
        fact_id: FACT-legacy-link-mark-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: symbol_legacy_link_mark
---
Proves that the legacy symbol link mark code shall be symbol_legacy_link_mark, against the code Kibi reads at ingest.