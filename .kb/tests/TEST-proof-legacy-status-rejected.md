---
title: A requirement marked rejected shall be migrated as retired, by a regex proof
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
    - symbol_id: SYM-proof-legacy-status-rejected
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-suggested-requirement-status
    export: SUGGESTED_REQUIREMENT_STATUS.rejected
  proves:
    - CLAIM-356408991377FEF1
origin:
  kind: agent
  recorded_at: '2026-10-29T10:43:21.006Z'
id: TEST-proof-legacy-status-rejected
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-576b8997154363b98130e521
    test_id: TEST-proof-legacy-status-rejected
    scope: unit
    outcome: passed
    code_snapshot: 75ff4ee7acf59364e64a28468f6c5c8a520cf004ae0ba78422da28d17aa0b332
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-11T18:11:09.814Z'
    finished_at: '2026-11-11T18:11:09.973Z'
    artifact_digest: 84de899f685a081b1804545ca39a57dc332ddd3302bed7f94437d85879221ab2
    contract_hash: e9b978927eecd5c24d4cebf10f1de58d043ada4c81465d534cf4df3288eea63a
    binding_hash: 63b9b48ef7935861bda980e1cd554bdbdde4e7d89ee5893f86aafdc4d6bbb6ca
    fingerprint: 1706329061766fc93c589dc02ed291fd2b0e485df61161f40de2a8adddfa51ec
    fingerprint_components:
      contract: e9b978927eecd5c24d4cebf10f1de58d043ada4c81465d534cf4df3288eea63a
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
      - symbol_id: SYM-proof-legacy-status-rejected
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
      test_id: TEST-proof-legacy-status-rejected
      pattern:
        symbol_id: SYM-migration-suggested-requirement-status
        type: string
        value: retired
    certificate_digest: c28ba9619a38d5caf2321a1714393e62d43488186f15906308798b5eb367c5d9
    claim_bindings:
      - claim_key: CLAIM-356408991377FEF1
        requirement_id: REQ-cli-migration-suggested-status
        fact_id: FACT-legacy-status-rejected
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: retired
---
Proves that a requirement marked rejected shall be migrated as retired, against the code Kibi reads at ingest.