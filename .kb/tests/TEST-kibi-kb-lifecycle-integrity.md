---
title: kibi migrate closes superseded requirements and cleans dead sources, leaving cycles and unsafe edits for review
status: passing
tags:
  - lifecycle
  - supersedes
  - source
  - migration
  - checks
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
text_ref: packages/cli/tests/commands/migrate-lifecycle.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T05:38:07.658Z'
id: TEST-kibi-kb-lifecycle-integrity
type: test
priority: must
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-kb-lifecycle-integrity
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-kb-lifecycle-integrity
    target: default
    native_id: packages/cli/tests/commands/migrate-lifecycle.test.ts::kibi migrate lifecycle repairs::plans and applies the lifecycle repairs on a schema 6 KB, leaving cycles and unsafe source edits for review
    source_file: packages/cli/tests/commands/migrate-lifecycle.test.ts
    line: 152
---
# kibi migrate closes superseded requirements and cleans dead sources, leaving cycles and unsafe edits for review

Runs the `kibi` CLI on a schema 6 workspace fixture (`packages/cli/tests/commands/migrate-lifecycle.test.ts`).

- `kibi migrate --format json` plans `close_superseded_requirements` for the open superseded requirement and `source_path_rewrite` that rewrites a legacy `documentation/` source to its `.kb/` file and removes a self-referencing source and a source that resolves to nothing, both as automatic actions.
- A two-requirement supersession cycle and a source value that cannot be edited safely become review actions instead.
- `kibi migrate --apply-safe` changes only the status line and the source lines it planned, leaves the cycle and the unsafe value untouched, and `kibi check --rules superseded-requirement-open,source-path-dangling` then reports only the cycle (once) and the unsafe source.
- A second plan carries only the two review actions.
