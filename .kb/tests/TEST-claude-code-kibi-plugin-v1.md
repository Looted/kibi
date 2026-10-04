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
    - symbol_id: SYM-claude-case-usage-telemetry
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
  - symbol_id: SYM-claude-case-usage-telemetry
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::usage telemetry::records whether the agent consulted Kibi before reading and editing
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 472
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-412ae2061af27615074ba951
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: b9cb051e6e2093db3698fdfafc5e3fc09557479b83ed82783e3845c32b945cc9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-01T21:24:12.610Z'
    finished_at: '2026-10-01T21:24:13.682Z'
    artifact_digest: e97626570c74e24d24e09bf8c74a51dac8e548085c116b8f9ffc69e29ed00116
    contract_hash: 252c4871c7b4f76dc0f90349ab4541e69844fe3ff8881fd17a1a9f502599a2a6
    binding_hash: 7f0c1963fba9ab46bb0498f07872bfde5333b952c824b318a79cd305e4f99bd8
    fingerprint: ed0726a57196b5a8adbc0e4f435e2abc69c56759ce0846e90905f6f9679cab6d
    fingerprint_components:
      contract: 252c4871c7b4f76dc0f90349ab4541e69844fe3ff8881fd17a1a9f502599a2a6
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ba6dc1da8fcf102e684965991676f5f03673de3b43157c2aea9a98dae3d99528
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
      - symbol_id: SYM-claude-case-usage-telemetry
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c25d484ceb7e749f76d07c92
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: b9cb051e6e2093db3698fdfafc5e3fc09557479b83ed82783e3845c32b945cc9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-01T21:27:13.357Z'
    finished_at: '2026-10-01T21:47:13.546Z'
    artifact_digest: 76225bb827e6a294dc164a1202107a3e4aba2ea58f76d7241ae7698bba9fda86
    contract_hash: 252c4871c7b4f76dc0f90349ab4541e69844fe3ff8881fd17a1a9f502599a2a6
    binding_hash: 7f0c1963fba9ab46bb0498f07872bfde5333b952c824b318a79cd305e4f99bd8
    fingerprint: ed0726a57196b5a8adbc0e4f435e2abc69c56759ce0846e90905f6f9679cab6d
    fingerprint_components:
      contract: 252c4871c7b4f76dc0f90349ab4541e69844fe3ff8881fd17a1a9f502599a2a6
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ba6dc1da8fcf102e684965991676f5f03673de3b43157c2aea9a98dae3d99528
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
      - symbol_id: SYM-claude-case-usage-telemetry
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-claude-case-unconfigured-workspace-silent
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +144 more'
      - symbol_id: SYM-claude-case-read-snippet-once
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +144 more'
      - symbol_id: SYM-claude-case-edit-focus
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +144 more'
      - symbol_id: SYM-claude-case-stop-reminder-once
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +144 more'
      - symbol_id: SYM-claude-case-prefixed-check-acknowledges
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +144 more'
      - symbol_id: SYM-claude-case-advisory-boundary
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +144 more'
      - symbol_id: SYM-claude-case-scanner-equivalence
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +144 more'
      - symbol_id: SYM-claude-case-shipped-bundle-runs
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +144 more'
      - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +144 more'
      - symbol_id: SYM-claude-case-optional-package-contract
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +144 more'
      - symbol_id: SYM-claude-case-usage-telemetry
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +144 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-978e9ae3f383e9e9fd4dc2e1
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: dcaadce4b493f233c03147bea2606f08698f648fb8b604c17716fe31630b8aa4
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-02T07:03:06.343Z'
    finished_at: '2026-10-02T07:03:07.561Z'
    artifact_digest: 8d77aeb6c59cb6c7dbd46802b569499527a12531c22cee6dfb24f48ec7b420a6
    contract_hash: 252c4871c7b4f76dc0f90349ab4541e69844fe3ff8881fd17a1a9f502599a2a6
    binding_hash: 7f0c1963fba9ab46bb0498f07872bfde5333b952c824b318a79cd305e4f99bd8
    fingerprint: ed0726a57196b5a8adbc0e4f435e2abc69c56759ce0846e90905f6f9679cab6d
    fingerprint_components:
      contract: 252c4871c7b4f76dc0f90349ab4541e69844fe3ff8881fd17a1a9f502599a2a6
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ba6dc1da8fcf102e684965991676f5f03673de3b43157c2aea9a98dae3d99528
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
      - symbol_id: SYM-claude-case-usage-telemetry
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-98a229bbfbf7a10f6ac4aa7f
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: d4a9aa895a5bbb076a23a1df32c0e5f44f918957ffb78eadfea719f9740d8745
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-02T11:37:51.409Z'
    finished_at: '2026-10-02T11:37:54.860Z'
    artifact_digest: d77afe1e414b82dbe3823d2430d5a3165086af26ef6792b1713c439d7119ed93
    contract_hash: 1e1bbed463a02f0f6b8bc833aedbdbbcd64f5e4b9b1c7440e7445ac4ef169b72
    binding_hash: a869a12665a752d593eb988a2662a6534f804280b8680ae489067402ec034682
    fingerprint: c4508b6905617adff8fdbdec88bc3eae9a69beae00eb6c45ed5ab72b9acaaa16
    fingerprint_components:
      contract: 1e1bbed463a02f0f6b8bc833aedbdbbcd64f5e4b9b1c7440e7445ac4ef169b72
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 29156618b47d4122d0ae9b2629fead667798cafe79f1848c98a3af9e6f678228
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
      - symbol_id: SYM-claude-case-usage-telemetry
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-follows-session-workspace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-55a040ee7c3ce6f1a30c44d2
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: da26525d079dd86fb73afde2fccf06d01dfd78dffb446a5edd51cbf495156214
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-02T11:40:14.389Z'
    finished_at: '2026-10-02T11:40:17.256Z'
    artifact_digest: b5cbcee5b977e1a81da21410bafce0846f74ade202119a59244203bd091f7f71
    contract_hash: 1e1bbed463a02f0f6b8bc833aedbdbbcd64f5e4b9b1c7440e7445ac4ef169b72
    binding_hash: c0003fed9f6157f8b06fd649f996e50326ad407f80d7f5f8d38c2b2baa4eeb71
    fingerprint: c4508b6905617adff8fdbdec88bc3eae9a69beae00eb6c45ed5ab72b9acaaa16
    fingerprint_components:
      contract: 1e1bbed463a02f0f6b8bc833aedbdbbcd64f5e4b9b1c7440e7445ac4ef169b72
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 29156618b47d4122d0ae9b2629fead667798cafe79f1848c98a3af9e6f678228
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
      - symbol_id: SYM-claude-case-usage-telemetry
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-follows-session-workspace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-569eb2a85a132e4d3460b7c9
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8f6fd7e91a7fff83398a2012a87aa1986842af02a441957a5b40fa37223e350a
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-02T11:56:06.203Z'
    finished_at: '2026-10-02T11:56:10.653Z'
    artifact_digest: ab123ca7e7263aeb883032ba5f8273d2f2a1872288b936e38069ac19639b15fc
    contract_hash: 1e1bbed463a02f0f6b8bc833aedbdbbcd64f5e4b9b1c7440e7445ac4ef169b72
    binding_hash: a82e3b8cd58114423c43d21f3bcfdbbbc36bcd04f24bbd3bbab958d34c8a9365
    fingerprint: c4508b6905617adff8fdbdec88bc3eae9a69beae00eb6c45ed5ab72b9acaaa16
    fingerprint_components:
      contract: 1e1bbed463a02f0f6b8bc833aedbdbbcd64f5e4b9b1c7440e7445ac4ef169b72
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 29156618b47d4122d0ae9b2629fead667798cafe79f1848c98a3af9e6f678228
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
      - symbol_id: SYM-claude-case-usage-telemetry
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-follows-session-workspace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b25d7039f95f9c15189e3c53
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 378af9c44994d2053b3895430f528fb957e979c883f509ef28572f47881ccc9a
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-02T12:11:12.093Z'
    finished_at: '2026-10-02T12:11:16.549Z'
    artifact_digest: f0338677b6458a4563c04516210505838c6026d8f1bc9696593edf544d70df5a
    contract_hash: 1e1bbed463a02f0f6b8bc833aedbdbbcd64f5e4b9b1c7440e7445ac4ef169b72
    binding_hash: 0efa4fa9317abd47f078cce33887c0f671dc59a7477d9f70e85c190f35feee61
    fingerprint: c4508b6905617adff8fdbdec88bc3eae9a69beae00eb6c45ed5ab72b9acaaa16
    fingerprint_components:
      contract: 1e1bbed463a02f0f6b8bc833aedbdbbcd64f5e4b9b1c7440e7445ac4ef169b72
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 29156618b47d4122d0ae9b2629fead667798cafe79f1848c98a3af9e6f678228
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
      - symbol_id: SYM-claude-case-usage-telemetry
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-follows-session-workspace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4680d870217d542664bb9adc
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 10d6d7f8bb787adbc41b1b751be60ffb8a696a9c8f7ab50d6f575f007ee35c23
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-02T15:22:58.647Z'
    finished_at: '2026-10-02T15:22:59.626Z'
    artifact_digest: c3a76de0d72f8c24b7e8a066ceca9479522c7748c56edbbbe014cc2511d5f9b2
    contract_hash: 252c4871c7b4f76dc0f90349ab4541e69844fe3ff8881fd17a1a9f502599a2a6
    binding_hash: e239464a971c511a2551b50ffd4b8165233f44891575b70c75802cbf9fac3b88
    fingerprint: ed0726a57196b5a8adbc0e4f435e2abc69c56759ce0846e90905f6f9679cab6d
    fingerprint_components:
      contract: 252c4871c7b4f76dc0f90349ab4541e69844fe3ff8881fd17a1a9f502599a2a6
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ba6dc1da8fcf102e684965991676f5f03673de3b43157c2aea9a98dae3d99528
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
      - symbol_id: SYM-claude-case-usage-telemetry
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# Verify the Claude Code Kibi plugin hooks, distribution, and opt-in behavior

Run with `bun test ./packages/claude`.

- `tests/hook-runner.test.ts`: snippet content, per-session dedupe, read-window and edit focus, suppression after Kibi exploration, the unowned-file note, the one-shot `.kb/` and search notes, Stop reminders and their acknowledgment by host-prefixed MCP and CLI checks, session isolation, silence outside Kibi workspaces, and the advisory boundary (no deny, no input rewrite, no workspace writes).
- `tests/knowledge-index.test.ts`: the manifest line scanner matches a full YAML parse on writer and hand-authored layouts; cache reuse and invalidation; entity summary lookup cannot escape its lane.
- `tests/distribution.test.ts`: the committed hook bundle matches the source and runs under Node; concurrent hook processes keep every journal event; manifests reference shipped files; skill names equal skill ids; the package has no install lifecycle; the MCP launcher exposes no tools outside Kibi workspaces.
