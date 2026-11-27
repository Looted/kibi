---
title: Kibi release version tests
status: passing
priority: must
tags:
  - release
  - versioning
  - doctor
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-release-version-script
      target: default
    - symbol_id: SYM-test-kibi-release-version-cli
      target: default
    - symbol_id: SYM-test-kibi-release-version-mcp
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-04T05:50:00.000Z'
id: TEST-kibi-release-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-65a7a7265e3a111ebb216283
    test_id: TEST-kibi-release-version
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 50369c452ed010fe5a9d6f68c1dec67e7e51c1c7980e09c93d381c6cd18ee799
    binding_hash: 83d579b77e66f80e6df071424984e2b85399bbd44abd7d9d146fb52eb03210d9
    fingerprint: d5bc8e6c656e608de4740b60cd6a875b840db42327b9d8be12000d0c7e504daa
    fingerprint_components:
      contract: 50369c452ed010fe5a9d6f68c1dec67e7e51c1c7980e09c93d381c6cd18ee799
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
      - symbol_id: SYM-test-kibi-release-version-script
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-kibi-release-version-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-test-kibi-release-version-mcp
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `bun run version-packages` in a fixture workspace and checks that it assigns the next calendar release version, patch-bumps kibi-core so the manifest ships and prepends the release to the history; checks that `release:check` fails on a drifted package version; and checks that `kibi --version`, the `kibi doctor` Kibi release check (including the mixed-install warning) and the MCP server title read the manifest that kibi-core ships.