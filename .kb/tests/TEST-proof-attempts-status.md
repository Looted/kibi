---
title: A proof run attempts status shall be complete or unavailable, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-attempts-status
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-attempts-status-2
  proves:
    - CLAIM-90AD356D3D051F57
origin:
  kind: agent
  recorded_at: '2026-10-28T17:48:52.175Z'
id: TEST-proof-attempts-status
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1f934118e7a732db27863e47
    test_id: TEST-proof-attempts-status
    scope: unit
    outcome: passed
    code_snapshot: 0e92ecb6e2415cb6b44cd4648abe5bf8c9c235c18d9f56844e07e29be087804d
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T11:21:23.092Z'
    finished_at: '2026-11-16T11:22:49.884Z'
    artifact_digest: 4c5ff880d8b0e5e45dca5d0803c0c793347804c85ecfaa631ec1e84c2fe84bfa
    contract_hash: 4501b5ecd381730129d9853999a73faacda36c70d632ce94ed00a9788f8362a4
    binding_hash: 4906f8144cb6737dc2b19f265af6480de5dade2093f7a304296c0eaa5c85749a
    fingerprint: 163d8f2229e3523df50814ccc1ab56c4e661d4c935e9112c0cb1e4ac9225ec13
    fingerprint_components:
      contract: 4501b5ecd381730129d9853999a73faacda36c70d632ce94ed00a9788f8362a4
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
      - symbol_id: SYM-proof-attempts-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-attempts-status
      domain:
        symbol_id: SYM-attempts-status-2
        members:
          - complete
          - unavailable
      results:
        - member: complete
          outcome: passed
        - member: unavailable
          outcome: passed
    certificate_digest: e800e08f82f58060c6104aa514992ec9b8c22f454238d5bb8f42fdad58270de5
    claim_bindings:
      - claim_key: CLAIM-90AD356D3D051F57
        requirement_id: REQ-kibi-proof-result-vocabulary
        fact_id: FACT-attempts-status
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - complete
            - unavailable
---
Proves that a proof run attempts status shall be complete or unavailable, against the code Kibi reads at ingest.