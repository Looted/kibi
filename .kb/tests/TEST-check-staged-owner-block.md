---
title: Staged check owner block tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T16:50:00.000Z'
id: TEST-check-staged-owner-block
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-staged-owner-block
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-93bbf906b717f50e3fb8d379
    test_id: TEST-check-staged-owner-block
    scope: end_to_end
    outcome: passed
    code_snapshot: 5bbe0de2081518986b1aca50c38e5c4e90e91a57634fe618976e8543073209be
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T18:19:29.820Z'
    finished_at: '2026-11-16T18:20:49.146Z'
    artifact_digest: 7ab90799f85b4c90123c792a862aec0a000fa00c5ba5c8a172adc7a247b0d2a2
    contract_hash: af9d54f79b2aec4cb0906201341674d0a4cdaf63919b71ebb149e0aafe9bdf05
    binding_hash: 9994bf3eea5129defafbcdb55e96d61bb5930c05e9caf1b79893cd01dcedf1e4
    fingerprint: 363b8d11604c5c8548a70679867ea05869e0452d5373bc66cbf851a6f7d71fef
    fingerprint_components:
      contract: af9d54f79b2aec4cb0906201341674d0a4cdaf63919b71ebb149e0aafe9bdf05
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
      - symbol_id: SYM-test-check-staged-owner-block
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
verification_perspective: consumer
---
Runs the owner-findings unit tests, the staged verdict tests and the staged impact enforcement tests through the CLI: one new unowned function gives one blocking block with its candidate requirements and a paste-ready kb_upsert input, the merged findings are not printed, and the JSON result keeps them with ownerFindings.