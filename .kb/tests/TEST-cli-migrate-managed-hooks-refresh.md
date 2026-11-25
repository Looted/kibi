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
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8b75284490029047fa2324d9
    test_id: TEST-cli-migrate-managed-hooks-refresh
    scope: end_to_end
    outcome: passed
    code_snapshot: a4525b769ce598d24e8946b70bf207199226d079d7f593af82c9a916914d4ffd
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T09:44:41.831Z'
    finished_at: '2026-11-25T09:44:44.220Z'
    artifact_digest: 4459548bab75fd3dfe7b882d1780f248db4670f360e4564bf789f2d996727b6c
    contract_hash: 35a3d9b1cf5a3fc90f53e549b68be8d7a0b68f3d42904cba22a48f5d18f7135f
    binding_hash: 770d28bbee69a2c58d209627d8478acce9d6580a5627399c9196c07b0338ffab
    fingerprint: 38c2eab98b5308f9f9b2f50ea5d3871bc590c31e22da50e4c9bfc2ee231c7dcb
    fingerprint_components:
      contract: 35a3d9b1cf5a3fc90f53e549b68be8d7a0b68f3d42904cba22a48f5d18f7135f
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
      - symbol_id: SYM-cli-migrate-managed-hooks-refresh-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `kibi migrate --yes`, `--dry-run`, `--format json` and `--apply-safe` in real Git repositories whose kibi-managed hook sections were written by another template, checks that the sections are rewritten while user lines stay, that the plan carries the automatic `git-hooks-refresh` action with its template digest and that a plan for another digest is refused, and that hook-manager checkouts, symlinked hooks and hooks without a managed section are left alone (packages/cli/tests/commands/migrate-managed-hooks.test.ts).
