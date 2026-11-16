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
    receipt_id: PR-7f08a8b7bf5d6fce680e4762
    test_id: TEST-proof-proof-integrations-path
    scope: unit
    outcome: passed
    code_snapshot: 687a75b3c57bd11cbd5b1b79fcfa7589e153fe88b2edd678594f1eb4f347fdda
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T11:11:44.143Z'
    finished_at: '2026-11-16T11:13:25.311Z'
    artifact_digest: f79044ea9b4e1d539c65f539f226328db9b08c254176cc9b90d70a7f30e8803c
    contract_hash: f9c068082635ed5dc8a62a54f67e19e066963b2ed042c7c5dbe910804bd3e499
    binding_hash: 3a13202ac6b5797cc499cfa3c455b65a6a660d7fa739d92666d168d601f7665d
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
        requirement_id: REQ-kibi-proof-producers-and-storage
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