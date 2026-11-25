---
title: kibi migrate refreshes outdated kibi-managed hook sections on both routes and skips hook managers
status: active
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-25T09:44:08.089Z'
id: TEST-cli-migrate-managed-hooks-refresh
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-cli-migrate-managed-hooks-refresh-verifier
      target: default
  success_policy: all_required_first_attempt
---
Runs `kibi migrate --yes`, `--dry-run`, `--format json` and `--apply-safe` in real Git repositories whose kibi-managed hook sections were written by another template, checks that the sections are rewritten while user lines stay, that the plan carries the automatic `git-hooks-refresh` action with its template digest and that a plan for another digest is refused, and that hook-manager checkouts, symlinked hooks and hooks without a managed section are left alone (packages/cli/tests/commands/migrate-managed-hooks.test.ts).
