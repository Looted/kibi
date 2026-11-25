---
title: No-Git telemetry tests
status: active
priority: must
tags:
  - vcs
  - branching
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:22:06.370Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-cli-failure-categories
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-no-git-telemetry
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d0022d8eadc722c578f4f8b8
    test_id: TEST-kibi-no-git-telemetry
    scope: end_to_end
    outcome: passed
    code_snapshot: ab010f37efcf08fa96a686fb375f97e60fdc390a3cd0d543a237c0bfef7a8124
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T11:42:43.674Z'
    finished_at: '2026-11-25T11:43:02.951Z'
    artifact_digest: 4c58725237e73c4c5ec3d8de4f4c70b6affac79c855669eea943902f9844e3e6
    contract_hash: a0bcbba07404c61fc6dbb425c60fcf722c958f02c0bdb770a65fd9ca27e75457
    binding_hash: af5989579de218d948fe3a9ab85bdc5764057cb7c91bd19c81f2a23696266946
    fingerprint: c59366e8e844b54f630080a3f9ace73fcc8ff5016eea4c57c34d468c9718d93b
    fingerprint_components:
      contract: a0bcbba07404c61fc6dbb425c60fcf722c958f02c0bdb770a65fd9ca27e75457
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
      - symbol_id: SYM-test-kibi-cli-failure-categories
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks the CLI events of a successful init, the refused commit gate and an unreadable repository outside Git, with their status, category and vcs (packages/cli/tests/cli-failure-categories.test.ts), the vcs and vcs_reason properties and the rejected categories in agent-core (packages/agent-core/tests/usage-telemetry.test.ts, packages/agent-core/tests/usage-telemetry-outcomes.test.ts), and the events the built CLI queues for kibi init, kibi status and a refused kibi check --staged in a directory outside Git (packages/cli/tests/consumer/outside-git.test.ts).
