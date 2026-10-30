---
title: The proof integrations file shall be .kb/proof/integrations.json, by a regex proof
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
    - symbol_id: SYM-proof-proof-integrations-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-proof-integrations-path
  proves:
    - CLAIM-2BAB7735C9EF0E1A
origin:
  kind: agent
  recorded_at: '2026-10-28T17:49:29.341Z'
id: TEST-proof-proof-integrations-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-634f01713ed9db09f3a9bc95
    test_id: TEST-proof-proof-integrations-path
    scope: unit
    outcome: passed
    code_snapshot: 17256581582f43d83f66f4d6a118fecad7fcd8180df991d47ca9887713e21e82
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:52:35.631Z'
    finished_at: '2026-10-28T17:52:35.801Z'
    artifact_digest: c3398a7fc0fcd09833e8a60e1bc2148f277874527e50d22f865761c5c1038d5e
    contract_hash: f9c068082635ed5dc8a62a54f67e19e066963b2ed042c7c5dbe910804bd3e499
    binding_hash: 9ef75a597c4672b9f4d366ca48609f7fbd15a469b38e4706f5946f8704336d37
    fingerprint: 72ae2a3655f6acdaf57ab21d08a5d2a435c86ec933bc19044f713f08d43d6a61
    fingerprint_components:
      contract: f9c068082635ed5dc8a62a54f67e19e066963b2ed042c7c5dbe910804bd3e499
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
      - symbol_id: SYM-proof-proof-integrations-path
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
      test_id: TEST-proof-proof-integrations-path
      pattern:
        symbol_id: SYM-proof-integrations-path
        type: string
        value: .kb/proof/integrations.json
    certificate_digest: 53f58b1212706ce8b93d47293eca78a2fe613317ccb5f794c559ccaefd8f13bd
    claim_bindings:
      - claim_key: CLAIM-2BAB7735C9EF0E1A
        requirement_id: REQ-kibi-proof-run-vocabulary
        fact_id: FACT-proof-integrations-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kb/proof/integrations.json
---
Proves that the proof integrations file shall be .kb/proof/integrations.json, against the code Kibi reads at ingest.