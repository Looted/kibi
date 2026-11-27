---
title: The engine read inference limit environment variable shall be KIBI_ENGINE_READ_INFERENCE_LIMIT, by a regex proof
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
    - symbol_id: SYM-proof-engine-read-inference-limit-env
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-engine-limits-read-inference-limit-env
  proves:
    - CLAIM-C990EF48B58A51D4
origin:
  kind: agent
  recorded_at: '2026-10-28T10:31:11.379Z'
id: TEST-proof-engine-read-inference-limit-env
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-24b253541162da07b2442093
    test_id: TEST-proof-engine-read-inference-limit-env
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 5ddfe30350e2657c69deabfa98aebcc3b6a148c93369abd59479ab5dbf5645a8
    binding_hash: a802cebb44ac6a18ca3590c614fcbc80b5c2e232b647cb90bc964ce97b55514f
    fingerprint: a640be2ba6566ca6181fe544f9739d0c60dbfc3ead406bd2da5feb74739d9cf1
    fingerprint_components:
      contract: 5ddfe30350e2657c69deabfa98aebcc3b6a148c93369abd59479ab5dbf5645a8
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
      - symbol_id: SYM-proof-engine-read-inference-limit-env
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
      test_id: TEST-proof-engine-read-inference-limit-env
      pattern:
        symbol_id: SYM-engine-limits-read-inference-limit-env
        type: string
        value: KIBI_ENGINE_READ_INFERENCE_LIMIT
    certificate_digest: d8c9c3cfeeec200ba12582afadf947dde495bfb3080a5657c87bc3f24082b0b0
    claim_bindings:
      - claim_key: CLAIM-C990EF48B58A51D4
        requirement_id: REQ-core-engine-read-limit-settings
        fact_id: FACT-engine-read-inference-limit-env
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: KIBI_ENGINE_READ_INFERENCE_LIMIT
---
Proves that the engine read inference limit environment variable shall be KIBI_ENGINE_READ_INFERENCE_LIMIT, against the code Kibi reads at ingest.