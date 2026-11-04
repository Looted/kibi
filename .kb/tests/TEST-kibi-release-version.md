---
title: Kibi release version tests
status: active
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
---
Runs `bun run version-packages` in a fixture workspace and checks that it assigns the next calendar release version, patch-bumps kibi-core so the manifest ships and prepends the release to the history; checks that `release:check` fails on a drifted package version; and checks that `kibi --version`, the `kibi doctor` Kibi release check (including the mixed-install warning) and the MCP server title read the manifest that kibi-core ships.