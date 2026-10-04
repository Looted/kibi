---
id: TEST-zcode-kibi-plugin-v1
title: Verify ZCode Kibi plugin manifest, hooks, skills, and opt-in behavior
status: active
created_at: 2026-09-15T00:00:00.000Z
updated_at: 2026-09-16T00:00:00.000Z
priority: must
links:
  - type: validates
    target: SCEN-zcode-kibi-plugin-v1
  - type: validates
    target: REQ-zcode-kibi-plugin-v1
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: zcode-native
  required_proofs:
    - symbol_id: SYM-zcode-case-mutated-workspace-paths
      target: default
    - symbol_id: SYM-zcode-case-canonicalize-check-source-files
      target: default
    - symbol_id: SYM-zcode-case-unconfigured-workspace-silent
      target: default
    - symbol_id: SYM-zcode-case-session-state-isolation
      target: default
    - symbol_id: SYM-zcode-case-canonicalize-workspace-path
      target: default
    - symbol_id: SYM-zcode-case-packed-consumer-install-launch
      target: default
    - symbol_id: SYM-zcode-case-optional-package-contract
      target: default
    - symbol_id: SYM-zcode-case-readme-optional-adapter
      target: default
    - symbol_id: SYM-zcode-case-manual-mcp-fallback
      target: default
    - symbol_id: SYM-zcode-case-advisory-hooks
      target: default
    - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
      target: default
    - symbol_id: SYM-zcode-case-shipped-plugin-payload
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-90442fffeafa344502c0b548
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-04T22:06:58.707Z'
    finished_at: '2026-10-04T22:08:08.220Z'
    artifact_digest: 72750f8f59ecde0fd66f77d2f7132b902cd24b9e594371c04e6bc64a92a06473
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: e75220305a8e27569666ecc2a1075e50f56c1fb7a7701999348b92dea8e5f5ed
    fingerprint: 83e53832044bbb9c339cc41e250c538334aac11e2b130aa4f1c1073f4441730e
    fingerprint_components:
      contract: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
      integration: f76bb08ae079ddd3c7f0f61e3f0c6483de0971067b9dcca735c1a465a4383561
      command: 75249c45ddaab551990b3c97122926f5139c8b9b6de1c6326ddcf90acab518fc
      bindings: 49caa8a2a841c021e899e40b7fef5962d203d6d0cd1153f30bdc6fbc93379881
      producer: 0a46f16b4bb4a89955a224cedc6f8aa4d2e9a365e096a61d8c7f6b43df0f0dc2
    integration_id: zcode-native
    producer:
      name: kibi-zcode-proof-producer
      version: 1.0.0
    command_argv:
      - node
      - scripts/run-zcode-proof.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-zcode-case-mutated-workspace-paths
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::each supported mutating payload records its affected paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 5
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 5
      - symbol_id: SYM-zcode-case-unconfigured-workspace-silent
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::every hook event stays silent in an unconfigured workspace
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-session-state-isolation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner session isolation::separate hook processes recover the same session state
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 188
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 60416
      - symbol_id: SYM-zcode-case-optional-package-contract
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/package-contract.test.ts::kibi-zcode package contract::optional package contract has no install lifecycle or core runtime mutation
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 0
      - symbol_id: SYM-zcode-case-readme-optional-adapter
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/package-contract.test.ts::kibi-zcode package contract::README declares the ZCode adapter optional
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 0
      - symbol_id: SYM-zcode-case-manual-mcp-fallback
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/package-contract.test.ts::kibi-zcode package contract::manual MCP fallback is only for unused marketplace installs and invokes kibi-mcp
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 0
      - symbol_id: SYM-zcode-case-advisory-hooks
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook outputs are advisory and never hard deny
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 7
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 4845
proof_bindings:
  - symbol_id: SYM-zcode-case-mutated-workspace-paths
    target: default
    native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace
      opt-in::each supported mutating payload records its affected paths
    source_file: packages/zcode/tests/hook-runner.test.ts
    line: 420
  - symbol_id: SYM-zcode-case-canonicalize-check-source-files
    target: default
    native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace
      opt-in::absolute edit paths canonicalize against relative check paths
    source_file: packages/zcode/tests/hook-runner.test.ts
    line: 610
  - symbol_id: SYM-zcode-case-unconfigured-workspace-silent
    target: default
    native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace
      opt-in::every hook event stays silent in an unconfigured workspace
    source_file: packages/zcode/tests/hook-runner.test.ts
    line: 135
  - symbol_id: SYM-zcode-case-session-state-isolation
    target: default
    native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner session
      isolation::separate hook processes recover the same session state
    source_file: packages/zcode/tests/hook-runner.test.ts
    line: 1255
  - symbol_id: SYM-zcode-case-canonicalize-workspace-path
    target: default
    native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace
      opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
    source_file: packages/zcode/tests/hook-runner.test.ts
    line: 324
  - symbol_id: SYM-zcode-case-packed-consumer-install-launch
    target: default
    native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp
      consumer resolution::installs the local MCP tarball and launches it
      through the shipped Node launcher
    source_file: packages/zcode/tests/packed-consumer-smoke.test.ts
    line: 165
  - symbol_id: SYM-zcode-case-optional-package-contract
    target: default
    native_id: packages/zcode/tests/package-contract.test.ts::kibi-zcode package
      contract::optional package contract has no install lifecycle or core
      runtime mutation
    source_file: packages/zcode/tests/package-contract.test.ts
    line: 60
  - symbol_id: SYM-zcode-case-readme-optional-adapter
    target: default
    native_id: packages/zcode/tests/package-contract.test.ts::kibi-zcode package
      contract::README declares the ZCode adapter optional
    source_file: packages/zcode/tests/package-contract.test.ts
    line: 79
  - symbol_id: SYM-zcode-case-manual-mcp-fallback
    target: default
    native_id: packages/zcode/tests/package-contract.test.ts::kibi-zcode package
      contract::manual MCP fallback is only for unused marketplace installs and
      invokes kibi-mcp
    source_file: packages/zcode/tests/package-contract.test.ts
    line: 87
  - symbol_id: SYM-zcode-case-advisory-hooks
    target: default
    native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace
      opt-in::hook outputs are advisory and never hard deny
    source_file: packages/zcode/tests/hook-runner.test.ts
    line: 253
  - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
    target: default
    native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace
      opt-in::hook events never mutate .kb contents
    source_file: packages/zcode/tests/hook-runner.test.ts
    line: 286
  - symbol_id: SYM-zcode-case-shipped-plugin-payload
    target: default
    native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode
      distribution artifacts::an npm pack artifact ships the plugin manifest,
      hooks, launcher, skills, and command
    source_file: packages/zcode/tests/install-artifact.test.ts
    line: 107
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Exercise the ZCode adapter contract through the Linux/WSL `packages/zcode` bun test suite: the plugin manifest and MCP declaration match the ZCode schema, hooks declare only supported events with advisory outputs, the skills mirror stays in contract with the canonical bundled skills, and the hook runner stays silent outside opted-in workspaces. Regression coverage pins the corrected lifecycle: only file-mutating tools create dirty paths; dirty tracking, check acknowledgement, classification, and reminders share canonical workspace-relative path identities; a later edit invalidates a covering impact check for that exact path only; state is namespaced per host session with isolated unattributed events and hashed session keys; and the MCP launcher launches the resolved kibi-mcp entry shell-free with genuine missing-versus-launch-failure classification, verified end to end by subprocess tests that run the launcher and hook runner under Node. Copied-install and packed-artifact tests verify the marketplace and npm distribution actually contain and run the declared files. Local ZCode development, package builds, and adapter-suite validation run on Linux/WSL; a native Windows consumer end-to-end test is deferred.
