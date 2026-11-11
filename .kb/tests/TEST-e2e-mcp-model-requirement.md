---
title: MCP model_requirement returns strict and observation write plans
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-model-requirement
      target: default
  success_policy: all_required_first_attempt
id: TEST-e2e-mcp-model-requirement
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b860e1c74af268e9ec660b6c
    test_id: TEST-e2e-mcp-model-requirement
    scope: end_to_end
    outcome: passed
    code_snapshot: 77a05ac3f136388d07560216e6f9644997c4b9918c6920a54149f03a47779bca
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T05:33:42.441Z'
    finished_at: '2026-11-10T05:36:08.645Z'
    artifact_digest: dc8736db249dfdd88751ad8485abe81283e5b9591ca84f894b18a7ce3504ead7
    contract_hash: f104c1a0a83e68dd71fdc013616d15ed3e4f15cd3b967c1e6f239c6660363f5d
    binding_hash: 892944a606acb1badd5205ed9b6d9213ce0f518615b28a51284ae0609bcfa35a
    fingerprint: dd27d2e2284808bcf128f1c684d30bb8e65027730203e606007b7aa0d6d164d7
    fingerprint_components:
      contract: f104c1a0a83e68dd71fdc013616d15ed3e4f15cd3b967c1e6f239c6660363f5d
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
      - symbol_id: SYM-e2e-test-mcp-model-requirement
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Packed end-to-end regression for mcp model_requirement returns strict and observation write plans.
