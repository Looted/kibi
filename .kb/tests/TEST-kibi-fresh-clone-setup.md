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
    receipt_id: PR-ea9bd3fce2d5c7ecdd882d5a
    test_id: TEST-kibi-fresh-clone-setup
    scope: end_to_end
    outcome: passed
    code_snapshot: d45b0559445c3b6fbb8ac14475808fa46bcd23d18280075b337b4ba2d6ccc5bc
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-11-03T16:27:10.845Z'
    finished_at: '2026-11-03T16:27:46.082Z'
    artifact_digest: 30725070ad2a1ac8ff958a1b891463c38ba4b90dd36b92f5aa760b50780b263a
    contract_hash: ca45d73f2ac20b26f186705e09e42974bc28326827cfb3df5bfa5668c092eff7
    binding_hash: 8aeefc0f169dd341cc76469eb1c991722c2539aa0a2dd365548dba42d36c61f6
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