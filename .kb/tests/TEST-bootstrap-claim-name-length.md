---
title: Bootstrap claim name length tests
status: active
priority: must
tags:
  - bootstrap
  - modeling
  - naming
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-bootstrap-claim-name-length
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T09:14:09.400Z'
id: TEST-bootstrap-claim-name-length
type: test
---
Runs `packages/cli/tests/operations/bootstrap-claim-name-length.test.ts`, which shortens long aspects, plans intent claims and repository Markdown with long and colliding claim names, and checks the planned names, the shortening and disambiguation diagnostics and determinism.