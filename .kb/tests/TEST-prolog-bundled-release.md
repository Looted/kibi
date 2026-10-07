---
title: Platform package population, symlink materialization, release workflow, and publish-metadata controls
status: active
tags:
  - prolog
  - bundle
  - release
  - review:context-missing
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
    receipt_id: PR-e6e9d4b7a5293559d4dec444
    test_id: TEST-prolog-bundled-release
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
    binding_hash: 8ca5abd7814796c7b9827a8ab5c8d5db10c189486a6d3fc0e856dd0556fd2f67
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
