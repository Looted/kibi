---
title: The engine read time limit environment variable shall be KIBI_ENGINE_READ_TIME_LIMIT_MS, by a regex proof
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
    - symbol_id: SYM-proof-engine-read-time-limit-env
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-engine-limits-read-time-limit-env
  proves:
    - CLAIM-FE1B49EC94E4A1E4
origin:
  kind: agent
  recorded_at: '2026-10-28T10:30:45.896Z'
id: TEST-proof-engine-read-time-limit-env
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2ca947fa8f57d7fab30e74a5
    test_id: TEST-proof-engine-read-time-limit-env
    scope: unit
    outcome: passed
    code_snapshot: 7e969ef237f833cbd278efff81b932f3dfabb54a084313f49df8411b804224eb
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:32:26.072Z'
    finished_at: '2026-10-28T10:32:26.210Z'
    artifact_digest: f207c50765f2b6cf82c690c6cd18c3bdaa3233e4c3909753eabd04a62bf65061
    contract_hash: 14593824b95c3841b7eeb3b0753ba0ff9dc032fe2dc094e29e11459d38a14074
    binding_hash: e828426a1ae0df252d68afded720c5a9353f4a22200dc3757ae5e70be87fbe6d
    fingerprint: 2f654a5cdc22aa7cfd7516509ba56689142bf4c3c71a28963de3106ae90befcb
    fingerprint_components:
      contract: 14593824b95c3841b7eeb3b0753ba0ff9dc032fe2dc094e29e11459d38a14074
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
      - symbol_id: SYM-proof-engine-read-time-limit-env
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
      test_id: TEST-proof-engine-read-time-limit-env
      pattern:
        symbol_id: SYM-engine-limits-read-time-limit-env
        type: string
        value: KIBI_ENGINE_READ_TIME_LIMIT_MS
    certificate_digest: 5d8c1a12fc22ed64d4c0bbd0ff85396b156a4202ce03f8655fef12bc9a6e7cc9
    claim_bindings:
      - claim_key: CLAIM-FE1B49EC94E4A1E4
        requirement_id: REQ-core-engine-read-limit-settings
        fact_id: FACT-engine-read-time-limit-env
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: KIBI_ENGINE_READ_TIME_LIMIT_MS
---
Proves that the engine read time limit environment variable shall be KIBI_ENGINE_READ_TIME_LIMIT_MS, against the code Kibi reads at ingest.