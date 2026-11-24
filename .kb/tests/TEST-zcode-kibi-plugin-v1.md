---
id: TEST-zcode-kibi-plugin-v1
title: Verify ZCode Kibi plugin manifest, hooks, skills, and opt-in behavior
status: passing
created_at: 2026-09-15T00:00:00.000Z
updated_at: 2026-09-16T00:00:00.000Z
priority: must
links:
  - type: validates
    target: SCEN-zcode-kibi-plugin-v1
  - type: validates
    target: REQ-zcode-adapter-package
  - type: validates
    target: REQ-zcode-unowned-workspace-silence
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
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
    - symbol_id: SYM-zcode-case-tracked-hook-targets
      target: default
    - symbol_id: SYM-zcode-case-copied-install-runtime-files
      target: default
    - symbol_id: SYM-zcode-case-kb-call-without-workspace
      target: default
    - symbol_id: SYM-zcode-case-kb-call-names-workspace
      target: default
  success_policy: all_required_first_attempt
  version: kibi.proof-contract.v1
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2e60a5981a770c1551d2a95d
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 1ea225fe1793c41f69514dffbd58f69dedded4fb9d335ab36f64898ca34b26b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-24T04:26:07.757Z'
    finished_at: '2026-11-24T04:27:35.954Z'
    artifact_digest: 63c91b9d3930072ada04a4675b3a62bbfb2272c48cd3917dc9c13c9468492c05
    contract_hash: 1fd5caba9b52d20ca0ea38ddac95f539e151d42f079957a95332e0af30fae592
    binding_hash: 15c11d4829281645c19138c3ff36d66d62a498af6fbb40535bd525e9f98913e5
    fingerprint: 8c87a38e1d24a3250944d7eefef5c7d41082c2250bb8cd58a3f2fd3796941002
    fingerprint_components:
      contract: 1fd5caba9b52d20ca0ea38ddac95f539e151d42f079957a95332e0af30fae592
      integration: f76bb08ae079ddd3c7f0f61e3f0c6483de0971067b9dcca735c1a465a4383561
      command: 75249c45ddaab551990b3c97122926f5139c8b9b6de1c6326ddcf90acab518fc
      bindings: a9671800094b5f0c7741c3d4de61d01d273807fae0ad13e84b95c1ea6d6f990f
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
              duration_ms: 9
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
              duration_ms: 4
      - symbol_id: SYM-zcode-case-session-state-isolation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner session isolation::separate hook processes recover the same session state
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 215
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
              duration_ms: 77605
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
              duration_ms: 7
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 10
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 4741
      - symbol_id: SYM-zcode-case-tracked-hook-targets
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hooks.test.ts::kibi-zcode hooks.json::hook commands point at files a source checkout already contains
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 0
      - symbol_id: SYM-zcode-case-copied-install-runtime-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::a copied marketplace install contains every declared runtime file and runs under node
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 83
      - symbol_id: SYM-zcode-case-kb-call-without-workspace
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace stamp::PreToolUse names the session workspace on a Kibi MCP call that carries none
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
      - symbol_id: SYM-zcode-case-kb-call-names-workspace
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace stamp::PreToolUse leaves a Kibi MCP call that names a workspace alone
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
    kind: e2e
    evidence_level: tested
proof_bindings:
  - native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::each supported mutating payload records its affected paths
    source_file: packages/zcode/tests/hook-runner.test.ts
    symbol_id: SYM-zcode-case-mutated-workspace-paths
    target: default
  - native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
    source_file: packages/zcode/tests/hook-runner.test.ts
    symbol_id: SYM-zcode-case-canonicalize-check-source-files
    target: default
  - native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::every hook event stays silent in an unconfigured workspace
    source_file: packages/zcode/tests/hook-runner.test.ts
    symbol_id: SYM-zcode-case-unconfigured-workspace-silent
    target: default
  - native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner session isolation::separate hook processes recover the same session state
    source_file: packages/zcode/tests/hook-runner.test.ts
    symbol_id: SYM-zcode-case-session-state-isolation
    target: default
  - native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
    source_file: packages/zcode/tests/hook-runner.test.ts
    symbol_id: SYM-zcode-case-canonicalize-workspace-path
    target: default
  - native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
    source_file: packages/zcode/tests/packed-consumer-smoke.test.ts
    symbol_id: SYM-zcode-case-packed-consumer-install-launch
    target: default
  - native_id: packages/zcode/tests/package-contract.test.ts::kibi-zcode package contract::optional package contract has no install lifecycle or core runtime mutation
    source_file: packages/zcode/tests/package-contract.test.ts
    symbol_id: SYM-zcode-case-optional-package-contract
    target: default
  - native_id: packages/zcode/tests/package-contract.test.ts::kibi-zcode package contract::README declares the ZCode adapter optional
    source_file: packages/zcode/tests/package-contract.test.ts
    symbol_id: SYM-zcode-case-readme-optional-adapter
    target: default
  - native_id: packages/zcode/tests/package-contract.test.ts::kibi-zcode package contract::manual MCP fallback is only for unused marketplace installs and invokes kibi-mcp
    source_file: packages/zcode/tests/package-contract.test.ts
    symbol_id: SYM-zcode-case-manual-mcp-fallback
    target: default
  - native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook outputs are advisory and never hard deny
    source_file: packages/zcode/tests/hook-runner.test.ts
    symbol_id: SYM-zcode-case-advisory-hooks
    target: default
  - native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
    source_file: packages/zcode/tests/hook-runner.test.ts
    symbol_id: SYM-zcode-case-hooks-no-kb-mutation
    target: default
  - native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
    source_file: packages/zcode/tests/install-artifact.test.ts
    symbol_id: SYM-zcode-case-shipped-plugin-payload
    target: default
  - native_id: packages/zcode/tests/hooks.test.ts::kibi-zcode hooks.json::hook commands point at files a source checkout already contains
    source_file: packages/zcode/tests/hooks.test.ts
    symbol_id: SYM-zcode-case-tracked-hook-targets
    target: default
  - native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::a copied marketplace install contains every declared runtime file and runs under node
    source_file: packages/zcode/tests/install-artifact.test.ts
    symbol_id: SYM-zcode-case-copied-install-runtime-files
    target: default
  - symbol_id: SYM-zcode-case-kb-call-without-workspace
    target: default
    native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace stamp::PreToolUse names the session workspace on a Kibi MCP call that carries none
    source_file: packages/zcode/tests/hook-runner.test.ts
    line: 1551
  - symbol_id: SYM-zcode-case-kb-call-names-workspace
    target: default
    native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace stamp::PreToolUse leaves a Kibi MCP call that names a workspace alone
    source_file: packages/zcode/tests/hook-runner.test.ts
    line: 1576
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Exercise the ZCode adapter contract through the Linux/WSL `packages/zcode` bun test suite: the plugin manifest and MCP declaration match the ZCode schema, hooks declare only supported events with advisory outputs, the skills mirror stays in contract with the canonical bundled skills, and the hook runner stays silent outside opted-in workspaces. Regression coverage pins the corrected lifecycle: only file-mutating tools create dirty paths; dirty tracking, check acknowledgement, classification, and reminders share canonical workspace-relative path identities; a later edit invalidates a covering impact check for that exact path only; state is namespaced per host session with isolated unattributed events and hashed session keys; and the MCP launcher launches the resolved kibi-mcp entry shell-free with genuine missing-versus-launch-failure classification, verified end to end by subprocess tests that run the launcher and hook runner under Node. Copied-install and packed-artifact tests verify the marketplace and npm distribution actually contain and run the declared files. Local ZCode development, package builds, and adapter-suite validation run on Linux/WSL; a native Windows consumer end-to-end test is deferred.
