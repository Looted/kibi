---
title: Platform package population, symlink materialization, release workflow, and publish-metadata controls
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-72eb26a97f0c0d6870e2d920
    test_id: TEST-prolog-bundled-release
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 90befe66b5bacd5adf885964d2997f6dfb5ea822726771fafff6850de726706f
    binding_hash: 9d12fe728440c34af6192c9f984370ac5af4df96d3f2f1cfe450b4942c830b8c
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 4): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This checks package population, symlink materialization, the release workflow and publish metadata. A contract test enforces that the dry run can't publish.
