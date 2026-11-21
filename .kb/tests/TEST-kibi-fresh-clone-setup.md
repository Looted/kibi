---
title: 'Fresh-clone setup: recorded choices, agent instructions, prepare hooks, auto-compile and the missing-hooks note'
status: passing
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-03T15:26:56.765Z'
id: TEST-kibi-fresh-clone-setup
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-fresh-clone-setup-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-41741de653b649683e4a4791
    test_id: TEST-kibi-fresh-clone-setup
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: ca45d73f2ac20b26f186705e09e42974bc28326827cfb3df5bfa5668c092eff7
    binding_hash: c674483e8cefac669dec56cf41bc7a360a90a8b9cdb419dbc5b0ce72cc20152b
    fingerprint: 1eb998857b2c9c6e327be84e9afe5dcf3c645ef9301597e8c3b0ad3af9a9be1c
    fingerprint_components:
      contract: ca45d73f2ac20b26f186705e09e42974bc28326827cfb3df5bfa5668c092eff7
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
      - symbol_id: SYM-kibi-fresh-clone-setup-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `kibi init`, `kibi hooks install`, `kibi doctor` and the generated `prepare` step in real Git repositories and clones, checks the recorded setup choices, the managed `AGENTS.md` and `CLAUDE.md` sections, the prepare step with and without `kibi-cli` installed, that a store-backed query in a fresh branch compiles the store without touching tracked files unless auto-sync is off, and the session-start note for checkouts without Kibi's hooks (packages/cli/tests/commands/fresh-clone-setup.test.ts, packages/cli/tests/consumer/fresh-branch-store.test.ts, packages/agent-core/tests/checkout-hooks.test.ts).