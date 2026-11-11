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
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-91b3257f9fea0e2c7b8861ee
    test_id: TEST-kibi-kb-lifecycle-integrity
    scope: end_to_end
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:26:57.720Z'
    finished_at: '2026-11-04T18:27:03.427Z'
    artifact_digest: 35349b6a7d2f4d9181273a999840084607983fdc6fb057bec1a90630f6e7bc9a
    contract_hash: f1d7405e9750e907271d9ab062985fc5249b88866825318f5a6ef8ed9646e7ed
    binding_hash: 48e229564ccab3cab2dd1f2414b3a10325e612210383008bd86d1f5aca70ff8d
    fingerprint: 1f55c81e14e6550fe805554950ef766344ba58826fdac4c7c72b4e6c5ebd3e7a
    fingerprint_components:
      contract: f1d7405e9750e907271d9ab062985fc5249b88866825318f5a6ef8ed9646e7ed
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: b1d3ffa31f5e985e3df5c3c06179f4aaebce4e5b7d145e686deed4e2d8d6fe02
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-kb-lifecycle-integrity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# kibi migrate closes superseded requirements and cleans dead sources, leaving cycles and unsafe edits for review

Runs the `kibi` CLI on a schema 6 workspace fixture (`packages/cli/tests/commands/migrate-lifecycle.test.ts`).

- `kibi migrate --format json` plans `close_superseded_requirements` for the open superseded requirement and `source_path_rewrite` that rewrites a legacy `documentation/` source to its `.kb/` file and removes a self-referencing source and a source that resolves to nothing, both as automatic actions.
- A two-requirement supersession cycle and a source value that cannot be edited safely become review actions instead.
- `kibi migrate --apply-safe` changes only the status line and the source lines it planned, leaves the cycle and the unsafe value untouched, and `kibi check --rules superseded-requirement-open,source-path-dangling` then reports only the cycle (once) and the unsafe source.
- A second plan carries only the two review actions.
