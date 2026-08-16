---
id: TEST-core-journaled-engine-persistence
title: Journal replay, rollback, migration, audit atomicity, and compaction
status: active
created_at: 2026-08-11T00:00:00.000Z
updated_at: 2026-08-11T00:00:00.000Z
priority: must
tags:
  - core
  - persistence
  - migration
links:
  - type: validates
    target: SCEN-core-journaled-engine-migration
  - type: validates
    target: REQ-core-journaled-engine-persistence
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-core-journaled-engine-persistence
  required_case_symbols:
    - SYM-test-core-journaled-engine-persistence
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
type: test
---

The persistence suite attaches a journaled branch, verifies journal replay after
detach/reattach, proves a failed RDF transaction rolls back both entity and
audit resources, forces compaction, and checks that generation metadata and
audit exports remain consistent. Migration fixtures cover populated legacy
stores, corrupt input, digest/count mismatch, and repeated attempts.
