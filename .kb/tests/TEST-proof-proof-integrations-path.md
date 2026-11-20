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
    receipt_id: PR-16071da0913e95f2daebbb93
    test_id: TEST-proof-proof-integrations-path
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
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