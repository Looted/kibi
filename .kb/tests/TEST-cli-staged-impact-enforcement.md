---
id: TEST-cli-staged-impact-enforcement
title: CLI staged impact enforcement blocks behavior edits without evidence
status: passing
links:
  - type: validates
    target: SCEN-cli-staged-impact-enforcement
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-cli-workflows
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-39c14e6a28108e178a00ddb6
    test_id: TEST-cli-staged-impact-enforcement
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 6907ef1dd1aafd78b6175964c54f50e6a3e16c4660bbf6b8ecf05d3c6f654bb4
    binding_hash: 8b8bf73e983e1a5868e0b9231fd39959eb25e5f3ead9b19afabecf9ca24a0aa8
    fingerprint: 5802a43cc4640a02573b20e676f828c1d5e5aff77b3354c3d78855fbba53e8ae
    fingerprint_components:
      contract: 6907ef1dd1aafd78b6175964c54f50e6a3e16c4660bbf6b8ecf05d3c6f654bb4
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
      - symbol_id: SYM-e2e-cli-workflows
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# CLI Staged Impact Enforcement Tests

## Behavior Edit Without Evidence
- Stages a behavior-changing source edit
- Does NOT stage KB entity docs or refreshed manifest
- Expects `kibi check --staged` to exit non-zero
- Expects output to contain `kibi_impact_evidence_missing`
- Expects output to list the changed source path

## Behavior Edit With KB Evidence
- Stages a behavior-changing source edit
- Stages linked requirement markdown as KB evidence
- Refreshes and stages `documentation/symbols.yaml`
- Expects `kibi check --staged` to exit zero
- Expects no `kibi_impact_evidence_missing` diagnostic

## Test-Only Edits Exempt
- Stages a test-only file change (`tests/widget.test.ts`)
- Does NOT stage KB evidence
- Expects `kibi check --staged` to exit zero
- Expects no behavior impact diagnostics

## Docs-Only Edits Exempt
- Stages a docs-only change (`README.md`)
- Does NOT stage KB evidence
- Expects `kibi check --staged` to exit zero
- Expects no behavior impact diagnostics

## Stale Manifest Detection
- Stages a source edit that shifts symbol coordinates
- Reverts `documentation/symbols.yaml` to HEAD state
- Expects `kibi check --staged` to exit non-zero
- Expects output to contain `symbols_manifest_stale`
- Expects output NOT to contain `kibi_impact_evidence_missing`

## Refreshed Manifest Passes
- Stages a source edit that shifts symbol coordinates
- Syncs KB to refresh manifest
- Stages the refreshed `documentation/symbols.yaml`
- Expects `kibi check --staged` to exit zero
- Expects no `symbols_manifest_stale` diagnostic

## Existing Symbol Traceability Preserved
- Stages an unlinked symbol source edit
- Expects existing `changed_symbol_violation` to still appear
- New impact diagnostics can coexist with existing violations
