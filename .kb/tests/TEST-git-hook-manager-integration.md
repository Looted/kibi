---
title: Hook manager detection, printed manager configuration and doctor diagnosis
status: passing
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-29T18:38:31.498Z'
id: TEST-git-hook-manager-integration
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-git-hook-manager-integration-verifier
      target: default
  success_policy: all_required_first_attempt
---
Runs `kibi init` and `kibi doctor` in real Git repositories set up for lefthook, husky and the pre-commit framework, checks that init writes no hooks and prints the manager configuration, executes the printed lefthook and pre-commit commands with a stand-in runner, and checks doctor's verdicts on the manager configuration (packages/cli/tests/commands/hook-managers.test.ts).