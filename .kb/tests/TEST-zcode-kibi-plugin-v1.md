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
    receipt_id: PR-1030a06e8e91e1c3dad43606
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 3754e5b395adff6929063205f7100d6fefed2c1f077b500b8577207a4a3aa0e0
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-16T15:45:49.528Z'
    finished_at: '2026-09-16T16:20:34.944Z'
    artifact_digest: f417379bb36dbb64c2b3bf9b6df976afa77cf62d8f9ccb8b5c48629f09cca2db
    contract_hash: df9a0191ee5053978beba8cb1f7e85310bd6bfa7fda056357b1d59325a6144a1
    binding_hash: 197ca48623ae73c746e217b3227b9c7a8eb514803b4923df6c9e25ceb8cfdf62
    fingerprint: c39e93cbf7f4c239697fa8b260a84ed0becd8cda75d96b5f8f553ad4ef786293
    fingerprint_components:
      contract: df9a0191ee5053978beba8cb1f7e85310bd6bfa7fda056357b1d59325a6144a1
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
      - symbol_id: SYM-zcode-test-FIXTURE_SERVER_NAME
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-zcode-test-FIXTURE_ENTRY_SCRIPT
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-zcode-test-FixtureWorkspace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-zcode-test-createFixtureWorkspace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-zcode-test-hermeticEnv
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-zcode-test-workspaceKey
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-zcode-test-cleanupRoots
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-zcode-test-buildZcodePackageOnce
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ca7ecce1a33d0d38f967d410
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8dc34d39cf985d3e5df0bcdde99c308d04f86514b186af167d5be76cc0fc3094
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-17T06:46:09.088Z'
    finished_at: '2026-09-17T06:46:32.584Z'
    artifact_digest: 4d69dabaeec0b311c97e8c2c50df5bf8b5a042036126975444c413eacec97589
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: af7eedd68150fe8fe23878f598d6167cc97fb7300b978a7ef6bcb1eb8827c371
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 120
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 19309
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2309
  - version: kibi.proof-receipt.v1
    receipt_id: PR-42483fda660e40bf47d01e74
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 7838c8d4b64cce3eea025880c2e41caf951cc18119d89a0341e4740db8b6d4f5
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-17T08:39:01.732Z'
    finished_at: '2026-09-17T08:39:26.179Z'
    artifact_digest: a7bed3acfbb00b6be4e2c10ea04ba4ee5fd7fb6720a46e6ebbcfbd3e7753a3db
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: af7eedd68150fe8fe23878f598d6167cc97fb7300b978a7ef6bcb1eb8827c371
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
              duration_ms: 3
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
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
              duration_ms: 129
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 19661
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
              duration_ms: 8
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2600
  - version: kibi.proof-receipt.v1
    receipt_id: PR-dc8594fc83b918d062ac5de7
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9a73dc3467418fb64f2e17d0361eea4efb2cd22d7381e7013cabbe40dfbbe18f
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-17T09:32:52.760Z'
    finished_at: '2026-09-17T09:33:16.139Z'
    artifact_digest: 5cefd19c80f9baed385fba3640c70cf09cad0fe30cf08fe53f7cee6c1f79adb6
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: af7eedd68150fe8fe23878f598d6167cc97fb7300b978a7ef6bcb1eb8827c371
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
              duration_ms: 3
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 121
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 19176
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 4
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2261
  - version: kibi.proof-receipt.v1
    receipt_id: PR-06be2fbe468477e4c88d6582
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c679ec25919c58945fa3faf5d4350507d064967c4735f2fd0a7db029674a0f16
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-17T12:46:32.512Z'
    finished_at: '2026-09-17T12:46:57.805Z'
    artifact_digest: 4bad1d87961c1c7a78358313c3248a3565bf302f3a267873235a54b8dcb4837d
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: af7eedd68150fe8fe23878f598d6167cc97fb7300b978a7ef6bcb1eb8827c371
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 127
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 20921
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 4
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2428
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f8e4019356e2286370ace090
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 82583d2845302db2951548815aeeb65ec8245210e1b3f35f9871222b58ba20bb
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-17T20:39:11.401Z'
    finished_at: '2026-09-17T20:39:45.419Z'
    artifact_digest: 8ece3eb50da946aa8c4e2e3e90c37f347e17fb2721716c3eaeda537e405c149b
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: af7eedd68150fe8fe23878f598d6167cc97fb7300b978a7ef6bcb1eb8827c371
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
              duration_ms: 4
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
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
              duration_ms: 205
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 28988
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
              duration_ms: 2111
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4189b90c4b134087e46c5ea8
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 108fe624639c2c7c00ac5f051d948270f8c18926753c35581e701c3ae1bfc1aa
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T10:40:48.223Z'
    finished_at: '2026-09-18T10:41:17.201Z'
    artifact_digest: 5d900c49a33594691a9fc4b92e33d1236f1fb7a54d86050c501dc163187c391b
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: af7eedd68150fe8fe23878f598d6167cc97fb7300b978a7ef6bcb1eb8827c371
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 127
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 25455
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
              duration_ms: 4
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1524
  - version: kibi.proof-receipt.v1
    receipt_id: PR-2a5572845b4014f924ff9ffe
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 7dce1afe0fdd43aa1d0e4feea031d222163ed053450d755795c7e5b9b1b332b5
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T11:34:58.635Z'
    finished_at: '2026-09-18T11:35:18.499Z'
    artifact_digest: 4a688e7fda1a2bcab71fa85ba869e6e6b1fcf77e851eaf329a7174342bb35399
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: af7eedd68150fe8fe23878f598d6167cc97fb7300b978a7ef6bcb1eb8827c371
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 110
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 16937
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1220
  - version: kibi.proof-receipt.v1
    receipt_id: PR-898b4d0b924673da4f766ec7
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 8465c8db1c316b64cda7e0e5e8183795129f74cfda3fa1592a16e0e62df2d15b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T13:29:54.077Z'
    finished_at: '2026-09-18T13:30:23.767Z'
    artifact_digest: 3eea7527ab1186277ce012c919e0fb06cf07be41755e426af50e76dcf89fad95
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: af7eedd68150fe8fe23878f598d6167cc97fb7300b978a7ef6bcb1eb8827c371
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 126
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 26274
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
              duration_ms: 5
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1354
  - version: kibi.proof-receipt.v1
    receipt_id: PR-5a71b7481751d9f9108400ed
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 80f0752c31b50b1ccfc1fdae166abd9fa29214e6edd35bcc11c17fc0a1d4c6a9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T22:45:00.648Z'
    finished_at: '2026-09-18T22:45:20.526Z'
    artifact_digest: 6aede4b63e2e93aadcc966a211ef57dbd0c35dcb0607ddbec92cbcb3b9d13625
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
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
              duration_ms: 113
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 16889
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1245
  - version: kibi.proof-receipt.v1
    receipt_id: PR-87836fafd6b89c5330f9b6f3
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 39b771790c601f53ed3716f1281d2c43ba1f16e3afa435aaf6553f948010a5b2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T20:37:52.867Z'
    finished_at: '2026-09-19T20:38:32.561Z'
    artifact_digest: 7931b0c782dc31291cbe02f354d203b9cdf50f8665860f36cca749310f4b60ff
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 2
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
              duration_ms: 183
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 31782
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
              duration_ms: 8
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 4684
  - version: kibi.proof-receipt.v1
    receipt_id: PR-315aa44688b01ebbeed61f7a
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 681cb0098baf45c6ee059ff93a4a30032fcc24bb0df13208262766a1ad626b98
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T22:13:08.638Z'
    finished_at: '2026-09-19T22:13:44.974Z'
    artifact_digest: 6bf7811fbf4d0b50816524aa3d8ae85e2ba7b7e802ebb6c268cf4373d347aa57
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 4
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
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
              duration_ms: 218
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 29356
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
              duration_ms: 5
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3839
  - version: kibi.proof-receipt.v1
    receipt_id: PR-145dcd68b7dc2ff4227c6e31
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 62f33234a3e102c0d74a3a0c83bb8d78707e18fa19ab74217e11b62dffd2a1b9
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-19T23:04:55.462Z'
    finished_at: '2026-09-19T23:05:31.624Z'
    artifact_digest: 5da9c6a602656fd249cddc4f0f2de6acf8e13f383641542176c0dd39d6264d2a
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 4
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
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
              duration_ms: 183
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 29396
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
              duration_ms: 8
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3783
  - version: kibi.proof-receipt.v1
    receipt_id: PR-67929b7b19d9b3ed9f277c44
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 7f25f2a46139f6ac06fdf74fbcf081825e87a55b476b9dbcd8703916f789dba1
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-20T09:23:59.475Z'
    finished_at: '2026-09-20T09:24:22.085Z'
    artifact_digest: c2e23dced568e86042efd06c619e09964efb3de073e47415a8f6fa7f338571f0
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
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
              duration_ms: 107
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 18642
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 4
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2159
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c4f273a8f946f7297930aa00
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 14d1cc12c821bcf857094b5345a75a10bc64ad05314ae7cccf6d55f59c3bc63f
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-20T09:55:51.381Z'
    finished_at: '2026-09-20T09:56:14.477Z'
    artifact_digest: ffd3c00356998a9a5addf4a3719b2292a85a249b220c9353acf5c1bd3ccfd9c7
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 110
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 19062
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2156
  - version: kibi.proof-receipt.v1
    receipt_id: PR-649b339bd5f49815febf391a
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ef476e9b54adc78fdece502e3a61514b8cc097285066fabdd4d23ce2fff4a4bf
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-20T10:29:14.675Z'
    finished_at: '2026-09-20T10:29:37.963Z'
    artifact_digest: 69df02717f13af3923a6576d6c58feec77b796e6b5d9b9482794fe8d8f92b651
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 109
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 19168
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2259
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7a10c15bb9ab080714c3e5c3
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 5121581a82eca4fc4437fd6f4350a00caeb28c5219c327d8f7ca6242fb0ead78
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-20T11:29:03.918Z'
    finished_at: '2026-09-20T11:29:26.584Z'
    artifact_digest: 92e50ee89527e0d4de5421e37a60e8664eba2c741aa02c3ee19dab3948846987
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
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
              duration_ms: 113
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 18714
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2138
  - version: kibi.proof-receipt.v1
    receipt_id: PR-80ce7ae11844902d445872ad
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 93a04c7278bb979fdfcae0709e2bcbdc011452715f86dee03d399d40da6a314f
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-20T13:59:57.260Z'
    finished_at: '2026-09-20T14:00:20.769Z'
    artifact_digest: b51f336fa094e12eac49d845dc963dcceef7f58771d0bdddf5b6f2014f301840
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 3
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 116
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 19545
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2252
  - version: kibi.proof-receipt.v1
    receipt_id: PR-de70bfd3bf09863c974ebfba
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 6cecd7c0d94abb719ce50440f1dd485c4928232c022465a202f69397c9ddbef0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-22T12:55:32.664Z'
    finished_at: '2026-09-22T12:55:57.631Z'
    artifact_digest: 85f5e55e73ce9a8fe0d7cf8350aaee8a04564630a7dce4f29d87aad98fe52954
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
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
              duration_ms: 114
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 20266
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 4
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2752
  - version: kibi.proof-receipt.v1
    receipt_id: PR-21fc7fef75b8c17ad2f5b7f8
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: ad044833267451532130fb29a270f9fdeb641e43e42361db23c43a42a7ba931b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-22T13:42:43.440Z'
    finished_at: '2026-09-22T13:43:11.415Z'
    artifact_digest: f648dee69cd21b6ad6c4d035c81ce9f8cbd50cc94d6648bc4584a64d62653988
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 114
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 23960
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2308
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1448e8af03db9491dc9e92b8
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: f086b14d281d0462a85a25192503bdbd21d3502b82b7fa59f4c1ad861069a8a1
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-24T07:28:26.624Z'
    finished_at: '2026-09-24T07:29:04.841Z'
    artifact_digest: fbd1428772fd5239c8efc613e4ac6cd93a2cfaf8eca97500786b81b9495e4ceb
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 3
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 8
      - symbol_id: SYM-zcode-case-unconfigured-workspace-silent
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::every hook event stays silent in an unconfigured workspace
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-session-state-isolation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner session isolation::separate hook processes recover the same session state
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 163
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 31742
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
              duration_ms: 3
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 8
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 4027
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0676e10c5a728b03174df006
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 23f9c947e019135acd18b92c2576e62267881aaa30cbcc4faeda90f176afe316
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-25T01:12:16.360Z'
    finished_at: '2026-09-25T01:13:05.943Z'
    artifact_digest: 6b0dd63aeccde07414dece6488209a84ba6c4ce4bbc014b7b443b3c9a9c8c3d9
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 3
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
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
              duration_ms: 176
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 41609
      - symbol_id: SYM-zcode-case-optional-package-contract
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/package-contract.test.ts::kibi-zcode package contract::optional package contract has no install lifecycle or core runtime mutation
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 6
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 4860
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0e7800ed3153b774a2f5e4c9
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: e6762249fd7cec7fef04e1561dc4ab4d1a7edf4ec5314a24dd04fb705b3266e1
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-25T08:28:47.211Z'
    finished_at: '2026-09-25T08:29:14.416Z'
    artifact_digest: bc83897c40898edca49df8f7c56d36669312acd1fad2099da37d5d889ccc3d18
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
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
              duration_ms: 112
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 22920
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 4
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2366
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4ebd6a7f3cbd551aa4c4f333
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: a0b0eec82b911849b279b0bcc6fbad5d4e23da614bef3a58c16d45c6c05554cd
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-25T09:47:31.348Z'
    finished_at: '2026-09-25T09:47:57.429Z'
    artifact_digest: c7616bb8b29e341ca2e12434d73ac7ae0f0103e29913a5aca16a2e2685c6ad4f
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
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
              duration_ms: 118
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 22113
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2267
  - version: kibi.proof-receipt.v1
    receipt_id: PR-60beaff281d9523d96c836e6
    test_id: TEST-zcode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 026ba98b14e8f9c63ae16ae56544c40c7a9aec88d99e765c467feab4c93aed44
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-26T10:32:58.048Z'
    finished_at: '2026-09-26T10:33:28.962Z'
    artifact_digest: 6ada8aa3dd1e82836569dbcbf495530fcff846818006d6ea80c4b3c9414be54d
    contract_hash: 9cc4f9103ae1d25b24b84dc6c9d6fbfce1819c05fc201499f432c356053b053b
    binding_hash: 5d65cdd6e8c2ac718214ea582f2143896203738937b3d3bcd3da2a11e83889a8
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
              duration_ms: 2
      - symbol_id: SYM-zcode-case-canonicalize-check-source-files
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::absolute edit paths canonicalize against relative check paths
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2
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
              duration_ms: 116
      - symbol_id: SYM-zcode-case-canonicalize-workspace-path
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::PreToolUse canonicalizes absolute and ./-prefixed .kb targets
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 1
      - symbol_id: SYM-zcode-case-packed-consumer-install-launch
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/packed-consumer-smoke.test.ts::packed kibi-mcp consumer resolution::installs the local MCP tarball and launches it through the shipped Node launcher
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 24842
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
              duration_ms: 1
      - symbol_id: SYM-zcode-case-hooks-no-kb-mutation
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/hook-runner.test.ts::ZCode hook runner workspace opt-in::hook events never mutate .kb contents
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 3
      - symbol_id: SYM-zcode-case-shipped-plugin-payload
        target: default
        outcome: passed
        binding: native_case
        native_id: packages/zcode/tests/install-artifact.test.ts::kibi-zcode distribution artifacts::an npm pack artifact ships the plugin manifest, hooks, launcher, skills, and command
        attempts:
          status: complete
          entries:
            - outcome: passed
              duration_ms: 2554
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
---
Exercise the ZCode adapter contract through the Linux/WSL `packages/zcode` bun test suite: the plugin manifest and MCP declaration match the ZCode schema, hooks declare only supported events with advisory outputs, the skills mirror stays in contract with the canonical bundled skills, and the hook runner stays silent outside opted-in workspaces. Regression coverage pins the corrected lifecycle: only file-mutating tools create dirty paths; dirty tracking, check acknowledgement, classification, and reminders share canonical workspace-relative path identities; a later edit invalidates a covering impact check for that exact path only; state is namespaced per host session with isolated unattributed events and hashed session keys; and the MCP launcher launches the resolved kibi-mcp entry shell-free with genuine missing-versus-launch-failure classification, verified end to end by subprocess tests that run the launcher and hook runner under Node. Copied-install and packed-artifact tests verify the marketplace and npm distribution actually contain and run the declared files. Local ZCode development, package builds, and adapter-suite validation run on Linux/WSL; a native Windows consumer end-to-end test is deferred.
