---
title: Check policy contract and evaluation tests
status: active
tags:
  - plugins
  - check-policy
  - kb-check
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:12:47.830Z'
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-policy-sdk
      target: default
    - symbol_id: SYM-test-check-policy-rules
      target: default
    - symbol_id: SYM-test-check-policy-cli
      target: default
  success_policy: all_required_first_attempt
id: TEST-capability-check-policy
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-11b94b4f802f156f1843a38b
    test_id: TEST-capability-check-policy
    scope: end_to_end
    outcome: passed
    code_snapshot: 06bcb9d0b41a820d7ba77a759d45cbb22b0404df99c99db8f9b25cdbc68306f0
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-09T12:33:47.656Z'
    finished_at: '2026-10-09T12:33:49.433Z'
    artifact_digest: 818fa2a060a3606d75e1eb3a00ee055b363521ab490b3e384a3c29d2329b81b2
    contract_hash: 00027fa6b581d82f856e28a51a2c59440b151c258648bf9bd97dbe5c9f25b20e
    binding_hash: 17d173581398f56352a8b2869880ac646e734df322f2f6e62af6f82fd8e33a5c
    fingerprint: f9c52f38ce33477d69d6c912e14d069803ed18f0ae2f940a2e5b02e97f4a8cd5
    fingerprint_components:
      contract: 00027fa6b581d82f856e28a51a2c59440b151c258648bf9bd97dbe5c9f25b20e
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
      - symbol_id: SYM-test-check-policy-sdk
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-check-policy-rules
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-check-policy-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs the plugin SDK check policy suite, which validates policy documents, the capability slot and declinedPlugins parsing; the check policy rules suite, which evaluates ownership, exemption, supersession, marker and load-error cases and reads a policy from a package whose module throws on import; and the kibi check end-to-end case, which activates a policy in a temporary workspace and expects one ownership and one marker violation.
