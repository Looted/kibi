---
title: Platform package population, symlink materialization, release workflow, and publish-metadata controls
status: active
tags:
  - prolog
  - bundle
  - release
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-populate-swipl-platform-packages
      target: default
    - symbol_id: SYM-test-release-pack-workflow-contract
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-release
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3a46dbe7a7e6256a386f6a9a
    test_id: TEST-prolog-bundled-release
    scope: end_to_end
    outcome: passed
    code_snapshot: f0abb9af7fbf0f19529cce0ef65c6d7568fb8301b4229efb5dce7b8b71b96891
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T01:15:33.198Z'
    finished_at: '2026-10-01T01:15:37.577Z'
    artifact_digest: c7d00fb0a6e77c1ea0a120b5a9f80d72a7b1ddd12d17af979ecc9208bea28e43
    contract_hash: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
    binding_hash: 1bbee1b354b3ad3fc91319c779f5412ebf0cc7e22ee8c57d443b891a0b61d194
    fingerprint: 0db9a526989b18ce3572df9f881da47e49f76c7dab7318f8c5172ee4ad41f3ce
    fingerprint_components:
      contract: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
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
      - symbol_id: SYM-test-populate-swipl-platform-packages
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-release-pack-workflow-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
