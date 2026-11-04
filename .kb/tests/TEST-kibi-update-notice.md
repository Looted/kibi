---
title: Kibi update notice tests
status: active
priority: should
tags:
  - release
  - cli
  - doctor
  - update-notice
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-04T13:23:06.714Z'
id: TEST-kibi-update-notice
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-update-notice-cli
      target: default
  success_policy: all_required_first_attempt
---
Runs packages/cli/tests/update-check.test.ts: the notice text, version comparison and update command per install kind; the once-a-day notice and registry check with the cache; silence for JSON output, non-terminal stderr, CI, tests, dev builds and the opt-out variables; the kibi doctor Kibi updates row online, offline and with a newer KB schema; and a real detached background process that fetches the latest version from a local registry and writes the cache. It also pins that kibi-cli's package.json declares the KB schema the CLI writes.