---
id: TEST-git-hook-effective-install
title: Effective Git hooks path resolver, installer results, and init context regressions
status: passing
source: .kb/tests/TEST-git-hook-effective-install.md
links:
  - type: validates
    target: SCEN-git-hook-effective-install
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-git-hook-effective-install-init-context-verifier
      target: default
    - symbol_id: SYM-git-hook-effective-install-installer-verifier
      target: default
    - symbol_id: SYM-git-hook-effective-install-doctor-verifier
      target: default
    - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-9fc6fe179f3b386ac240beef
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: dd89a3bd639f852bd566dfe6dbca6955400b5fa5850b88fa37d22d33fe2da749
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T08:59:45.967Z'
    finished_at: '2026-09-26T08:59:53.215Z'
    artifact_digest: caca28c8fa678f536493868ae230124741e6d7ea321938548c9ce1d911462f85
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 6aed0b8a7d1a08fab07b63b9166b795cc16c20dce209cd305e6f232b068edf8e
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1858de6a482e567582b9e68a
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: passed
    code_snapshot: 45d848237d557a6e290df2f21725892d4a805ab3c66e339e91d3f63063bc431d
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T09:14:08.702Z'
    finished_at: '2026-09-26T09:14:15.062Z'
    artifact_digest: 9e4a815d4124863bbb04ec1c8b0f7253b077d6e30e02ee28dd2751c1aafcb740
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 6aed0b8a7d1a08fab07b63b9166b795cc16c20dce209cd305e6f232b068edf8e
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-e8d6778360a361c4db36e0fc
    test_id: TEST-git-hook-effective-install
    scope: end_to_end
    outcome: failed
    code_snapshot: 45d848237d557a6e290df2f21725892d4a805ab3c66e339e91d3f63063bc431d
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T09:16:48.105Z'
    finished_at: '2026-09-26T09:49:08.338Z'
    artifact_digest: 29d16748072a8b5bc21e7e3989b85a2f74045caa17d5cefd0f28a01bd7c20475
    contract_hash: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
    binding_hash: 6aed0b8a7d1a08fab07b63b9166b795cc16c20dce209cd305e6f232b068edf8e
    fingerprint: 489f196e14b2ca691b14b656d9212c65ec900389d049e0a73d2793f631ca90a8
    fingerprint_components:
      contract: 7fa8c407b2c397d430c179104ff0866128b5fa5185492535ba56badc54d4ec51
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-git-hook-effective-install-init-context-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +109 more'
      - symbol_id: SYM-git-hook-effective-install-installer-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +109 more'
      - symbol_id: SYM-git-hook-effective-install-doctor-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +109 more'
      - symbol_id: SYM-git-hook-effective-install-repository-context-verifier
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +109 more'
---

Real-git regression coverage for effective hooks path handling:

- `packages/cli/tests/utils/git-repository-context.test.ts` — resolver unit
  cases with isolated fixture git config: normal repository, subdirectory,
  linked worktree (common hooks dir + validated primary root), bare
  repository reported unsupported, worktree of a bare repository (primary
  null), configured `core.hooksPath` with origin, config change visibility,
  and spaces in paths.
- `packages/cli/tests/commands/init-git-context.test.ts` — init inside a
  linked worktree (hooks in the common dir, worktree-local `.kb`), init from
  a subdirectory (no nested `.kb/`), root/subdirectory agreement for blocked
  branch attachments (unfinished journal, corrupted journal, legacy store,
  legacy+hashed conflict, identity-manifest mismatch), foreign-hook skip
  reporting with per-hook integration recipes, configured `core.hooksPath`
  installation, outside-repository hooksPath refusal, coverage-limitation
  messaging for relative hooks paths in worktrees, and bare-repository
  refusal.
- `packages/cli/tests/commands/install-hook-safety.test.ts` — symlinked hook
  files are never edited through their target (external plain hook, external
  kibi-managed block, dangling symlink, directory symlink); regular managed
  hooks stay idempotently updatable.
- `packages/cli/tests/commands/doctor-git-context.test.ts` — doctor verdicts
  agree from root/subdirectory/linked worktree, a `core.hooksPath` change is
  visible on the next in-process invocation, and configuration stays visible
  in missing-hook diagnostics.
- `packages/cli/tests/commands/init-coverage.test.ts` — updated installer
  success message assertions.

These tests spawn real `git` and the built CLI; they run in the CLI package
suite.
