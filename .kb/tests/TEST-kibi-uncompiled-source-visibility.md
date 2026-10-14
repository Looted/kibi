---
title: CLI reports uncompiled authored files in kb_check and kb_status and judges kb_upsert against the authored file
status: passing
priority: must
tags:
  - sync
  - upsert
  - status
  - check
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-migrate-legacy-requirement-status
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cli-migrate-legacy-requirement-status
    target: default
    native_id: packages/cli/tests/commands/migrate-legacy-status.test.ts::legacy requirement statuses and uncompiled sources::kb_upsert on an uncompiled requirement file is judged against that file and refused before writing
    source_file: packages/cli/tests/commands/migrate-legacy-status.test.ts
    line: 291
origin:
  kind: agent
  recorded_at: '2026-10-14T08:56:48.892Z'
id: TEST-kibi-uncompiled-source-visibility
type: test
---
Runs the CLI on a temporary workspace with a requirement file that sync cannot extract: `kibi check` reports the file and its extraction error as a blocking violation and `kibi status` reports it stale until the file is fixed. An upsert that only closes a requirement with pinned `semantic_text` and no inventory is refused with the proposition-complete message and leaves the file unchanged, an upsert that would keep the file uncompilable is refused naming the file, and an upsert that repairs an uncompiled ADR updates it in place and keeps its origin. Unit tests cover the extraction failure record, the status reasons and the authored-file lookup.
