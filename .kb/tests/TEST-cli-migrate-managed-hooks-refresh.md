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
    receipt_id: PR-01709dd36663590de1f1676f
    test_id: TEST-cli-migrate-managed-hooks-refresh
    scope: end_to_end
    outcome: passed
    code_snapshot: 4a14bf6120fb7b6cf64143ffd1b70bc7acb4461c7e6524f94337fa60159d4159
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-27T00:04:11.808Z'
    finished_at: '2026-11-27T00:04:13.987Z'
    artifact_digest: 69bbba35e460dad0cf714dd54ea9c0a7a90bea0ed0b88d654d8672c99a4679bb
    contract_hash: 35a3d9b1cf5a3fc90f53e549b68be8d7a0b68f3d42904cba22a48f5d18f7135f
    binding_hash: f84023290981703ed4468ae8f10bf53e896007a79ea36d0427e197a6d022a6aa
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
