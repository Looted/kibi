---
title: Check policy contract and evaluation tests
status: passing
tags:
  - plugins
  - check-policy
  - kb-check
priority: must
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-09: UI design plugin'
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9b5265ae9e7ea4cb4f61540f
    test_id: TEST-capability-check-policy
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 00027fa6b581d82f856e28a51a2c59440b151c258648bf9bd97dbe5c9f25b20e
    binding_hash: 9a8aee29cd1421a51b5ae3b5b0ed9edeca43437a1442ffde1c0e07c4e0e4fec7
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
    kind: e2e
    evidence_level: tested
---
Runs the plugin SDK check policy suite, which validates policy documents, the capability slot and declinedPlugins parsing; the check policy rules suite, which evaluates ownership, exemption, supersession, marker and load-error cases and reads a policy from a package whose module throws on import; and the kibi check end-to-end case, which activates a policy in a temporary workspace and expects one ownership and one marker violation.
