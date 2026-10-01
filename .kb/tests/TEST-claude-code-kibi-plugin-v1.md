---
title: Verify Claude Code Kibi plugin hooks, distribution, and opt-in behavior
status: passing
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - claude-code
  - plugin
  - hooks
id: TEST-claude-code-kibi-plugin-v1
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-claude-case-unconfigured-workspace-silent
      target: default
    - symbol_id: SYM-claude-case-read-snippet-once
      target: default
    - symbol_id: SYM-claude-case-edit-focus
      target: default
    - symbol_id: SYM-claude-case-stop-reminder-once
      target: default
    - symbol_id: SYM-claude-case-prefixed-check-acknowledges
      target: default
    - symbol_id: SYM-claude-case-advisory-boundary
      target: default
    - symbol_id: SYM-claude-case-scanner-equivalence
      target: default
    - symbol_id: SYM-claude-case-shipped-bundle-runs
      target: default
    - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
      target: default
    - symbol_id: SYM-claude-case-optional-package-contract
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-claude-case-unconfigured-workspace-silent
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::workspace opt-in::every event is silent and stateless outside a Kibi workspace
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 71
  - symbol_id: SYM-claude-case-read-snippet-once
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::pre-read snippets::a linked file shows requirement titles, symbols, tests, and next calls once
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 121
  - symbol_id: SYM-claude-case-edit-focus
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::pre-edit snippets::a first edit names the edited symbol and the impact check
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 193
  - symbol_id: SYM-claude-case-stop-reminder-once
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::stop reminders::unchecked source edits are reminded once, then the agent may stop
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 287
  - symbol_id: SYM-claude-case-prefixed-check-acknowledges
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::stop reminders::a host-prefixed kb_check naming the file acknowledges it
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 308
  - symbol_id: SYM-claude-case-advisory-boundary
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::advisory boundary::hooks never deny, rewrite input, or touch the workspace
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 390
  - symbol_id: SYM-claude-case-scanner-equivalence
    target: default
    native_id: packages/claude/tests/knowledge-index.test.ts::symbol manifest scanner::matches a full YAML parse on the canonical writer layout
    source_file: packages/claude/tests/knowledge-index.test.ts
    line: 44
  - symbol_id: SYM-claude-case-shipped-bundle-runs
    target: default
    native_id: packages/claude/tests/distribution.test.ts::kibi-claude distribution artifacts::the bundle runs under node and emits Claude Code hook JSON
    source_file: packages/claude/tests/distribution.test.ts
    line: 59
  - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
    target: default
    native_id: packages/claude/tests/distribution.test.ts::kibi-claude MCP launcher::serves no tools when the project dir does not own .kb/manifest.json
    source_file: packages/claude/tests/distribution.test.ts
    line: 282
  - symbol_id: SYM-claude-case-optional-package-contract
    target: default
    native_id: packages/claude/tests/distribution.test.ts::kibi-claude package contract::optional package contract has no install lifecycle or runtime dependencies
    source_file: packages/claude/tests/distribution.test.ts
    line: 222
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-bd5f243da510c33089b51b58
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 2491299a3fae1ee212a1003f354f699e893d0930502345c6709175018df98d22
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-27T09:51:50.341Z'
    finished_at: '2026-09-27T09:51:51.312Z'
    artifact_digest: d4e17dcff308c5c75e034d7981fefff6afa5b8bd6443712a02eff436d1ad98cc
    contract_hash: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
    binding_hash: 6d1238267a09385bfaf7bf19dce0b8dbb19f4369b473461cbc96f82ac66d3e9b
    fingerprint: d414adaacef0b603643a49a9b108f9410a39641ee94cf5e2ade81337865027a4
    fingerprint_components:
      contract: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: cedb35e8646279227314bac92644f91569206ac1e2d5dd30e951db57f3852fc6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-claude-case-unconfigured-workspace-silent
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-read-snippet-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-edit-focus
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-stop-reminder-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-prefixed-check-acknowledges
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-advisory-boundary
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-scanner-equivalence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-shipped-bundle-runs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-optional-package-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-d420b04bc72ca7b4727f77c8
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: a53859f2f439ec2624dd41c4a132252044c0e670cc24cdad4ee4c22577f7288f
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-28T19:04:13.896Z'
    finished_at: '2026-09-28T19:04:14.523Z'
    artifact_digest: 0cfb3b15028347da720abea1dc92ff5ff964fa36ef9cae9d37f542c26a90b696
    contract_hash: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
    binding_hash: f5b0a0048f89c7dd5faf5e47a0a19a1f21adb7579db3a984cef0e33f5f07b2ad
    fingerprint: d414adaacef0b603643a49a9b108f9410a39641ee94cf5e2ade81337865027a4
    fingerprint_components:
      contract: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: cedb35e8646279227314bac92644f91569206ac1e2d5dd30e951db57f3852fc6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-claude-case-unconfigured-workspace-silent
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-read-snippet-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-edit-focus
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-stop-reminder-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-prefixed-check-acknowledges
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-advisory-boundary
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-scanner-equivalence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-shipped-bundle-runs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-optional-package-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8aed4953f76bcc58306e9f7f
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9a877a45c8b46ba5210c4f71d657c1ec163d14101fbefcf35d4a28a8973e3669
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-28T20:16:21.660Z'
    finished_at: '2026-09-28T20:16:22.285Z'
    artifact_digest: 6c4baf9e1543a6eaaf3e42cb43106982994d9aee63581ac38409aa070bfb3878
    contract_hash: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
    binding_hash: 12ce9cfb0817a09b9ed4d4891580231091b244d08e5467eea23a916d39dc3082
    fingerprint: d414adaacef0b603643a49a9b108f9410a39641ee94cf5e2ade81337865027a4
    fingerprint_components:
      contract: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: cedb35e8646279227314bac92644f91569206ac1e2d5dd30e951db57f3852fc6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-claude-case-unconfigured-workspace-silent
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-read-snippet-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-edit-focus
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-stop-reminder-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-prefixed-check-acknowledges
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-advisory-boundary
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-scanner-equivalence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-shipped-bundle-runs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-optional-package-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7d57fa5ad230431b3fa650e1
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 929a2bffbc0505e38bf19d595788f7d828560a5dcbc0657e4f5b5e9cbbc6d807
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-30T09:34:29.510Z'
    finished_at: '2026-09-30T09:53:47.264Z'
    artifact_digest: bf1056b84a11011e16a37703ce5da52de1172c40ecacc8002976e09efa49291d
    contract_hash: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
    binding_hash: 12ce9cfb0817a09b9ed4d4891580231091b244d08e5467eea23a916d39dc3082
    fingerprint: d414adaacef0b603643a49a9b108f9410a39641ee94cf5e2ade81337865027a4
    fingerprint_components:
      contract: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: cedb35e8646279227314bac92644f91569206ac1e2d5dd30e951db57f3852fc6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-claude-case-unconfigured-workspace-silent
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-read-snippet-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-edit-focus
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-stop-reminder-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-prefixed-check-acknowledges
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-advisory-boundary
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-scanner-equivalence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-shipped-bundle-runs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-optional-package-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c1aedbfb5d524019c961ee64
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 8fb074352a17be05561541067c14da2d9e6e89e777386919772553e67b77500b
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:11:59.335Z'
    finished_at: '2026-10-01T09:38:24.320Z'
    artifact_digest: a675541cbee50c14cb84530ccb77adec70545b1e68ab237e85e2431e83d99ad8
    contract_hash: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
    binding_hash: 12ce9cfb0817a09b9ed4d4891580231091b244d08e5467eea23a916d39dc3082
    fingerprint: d414adaacef0b603643a49a9b108f9410a39641ee94cf5e2ade81337865027a4
    fingerprint_components:
      contract: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: cedb35e8646279227314bac92644f91569206ac1e2d5dd30e951db57f3852fc6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-claude-case-unconfigured-workspace-silent
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-read-snippet-once
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-edit-focus
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-stop-reminder-once
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-prefixed-check-acknowledges
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-advisory-boundary
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-scanner-equivalence
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-shipped-bundle-runs
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-optional-package-contract
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-claude-case-unconfigured-workspace-silent
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-claude-case-read-snippet-once
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-claude-case-edit-focus
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-claude-case-stop-reminder-once
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-claude-case-prefixed-check-acknowledges
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-claude-case-advisory-boundary
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-claude-case-scanner-equivalence
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-claude-case-shipped-bundle-runs
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
      - symbol_id: SYM-claude-case-optional-package-contract
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +143 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-92d86879b751f15a130e0413
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: b0a0bf2dc3bd1d4cf56aa9042728bfe8b43f10e7e26ae224cf684951c5473113
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T09:51:24.198Z'
    finished_at: '2026-10-01T10:20:28.398Z'
    artifact_digest: 67c88df13fd1cb31df3ae51c70db3030b178296242c3bae5b349197ffadcb1d3
    contract_hash: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
    binding_hash: 12ce9cfb0817a09b9ed4d4891580231091b244d08e5467eea23a916d39dc3082
    fingerprint: d414adaacef0b603643a49a9b108f9410a39641ee94cf5e2ade81337865027a4
    fingerprint_components:
      contract: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: cedb35e8646279227314bac92644f91569206ac1e2d5dd30e951db57f3852fc6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-claude-case-unconfigured-workspace-silent
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-read-snippet-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-edit-focus
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-stop-reminder-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-prefixed-check-acknowledges
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-advisory-boundary
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-scanner-equivalence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-shipped-bundle-runs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-optional-package-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-200bd1a334632f2a2a152161
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: f8c80dd7ef127c802baaac4d13480e36f0354458dbf12278f4c05ecd963af3a8
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T11:36:24.203Z'
    finished_at: '2026-10-01T12:02:27.097Z'
    artifact_digest: 3237662bfbe570c6aeb81885227c29d37b6585082c209f53d5c35a5c36ece74d
    contract_hash: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
    binding_hash: 12ce9cfb0817a09b9ed4d4891580231091b244d08e5467eea23a916d39dc3082
    fingerprint: d414adaacef0b603643a49a9b108f9410a39641ee94cf5e2ade81337865027a4
    fingerprint_components:
      contract: 4e3b1ac6521cbd1093008c94b8f37b9b5092be62fe4e0d6894116372dacbfcc5
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: cedb35e8646279227314bac92644f91569206ac1e2d5dd30e951db57f3852fc6
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-claude-case-unconfigured-workspace-silent
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-read-snippet-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-edit-focus
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-stop-reminder-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-prefixed-check-acknowledges
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-advisory-boundary
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-scanner-equivalence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-shipped-bundle-runs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-optional-package-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# Verify the Claude Code Kibi plugin hooks, distribution, and opt-in behavior

Run with `bun test ./packages/claude`.

- `tests/hook-runner.test.ts`: snippet content, per-session dedupe, read-window and edit focus, suppression after Kibi exploration, the unowned-file note, the one-shot `.kb/` and search notes, Stop reminders and their acknowledgment by host-prefixed MCP and CLI checks, session isolation, silence outside Kibi workspaces, and the advisory boundary (no deny, no input rewrite, no workspace writes).
- `tests/knowledge-index.test.ts`: the manifest line scanner matches a full YAML parse on writer and hand-authored layouts; cache reuse and invalidation; entity summary lookup cannot escape its lane.
- `tests/distribution.test.ts`: the committed hook bundle matches the source and runs under Node; concurrent hook processes keep every journal event; manifests reference shipped files; skill names equal skill ids; the package has no install lifecycle; the MCP launcher exposes no tools outside Kibi workspaces.
