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
---
Runs `kibi init`, `kibi hooks install`, `kibi doctor` and the generated `prepare` step in real Git repositories and clones, checks the recorded setup choices, the managed `AGENTS.md` and `CLAUDE.md` sections, the prepare step with and without `kibi-cli` installed, that a store-backed query in a fresh branch compiles the store without touching tracked files unless auto-sync is off, and the session-start note for checkouts without Kibi's hooks (packages/cli/tests/commands/fresh-clone-setup.test.ts, packages/cli/tests/consumer/fresh-branch-store.test.ts, packages/agent-core/tests/checkout-hooks.test.ts).