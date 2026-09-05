---
id: TEST-cli-sync-discovery-readme-ignore
title: CLI sync discovery ignores README markdown under entity directories
type: test
status: active
created_at: 2026-06-26T13:30:00.000Z
updated_at: 2026-06-26T13:30:00.000Z
tags:
  - cli
  - sync
  - discovery
  - regression
verification_scope: end_to_end
verification_perspective: internal
links:
  - type: validates
    target: SCEN-001
  - type: validates
    target: REQ-core-extractors
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-sync-discovery-readme-ignore
      target: default
  success_policy: all_required_first_attempt
---

The sync discovery unit tests verify that `discoverSourceFiles` excludes
`README.md` files under configured entity directories while still returning
actual entity markdown files.
