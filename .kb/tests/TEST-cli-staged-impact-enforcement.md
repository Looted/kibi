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
    receipt_id: PR-1104152fdd36ed43f0c1a3ae
    test_id: TEST-cli-staged-impact-enforcement
    scope: end_to_end
    outcome: passed
    code_snapshot: b95fa37681e8a263f7711717a0c81ed6eb85ba81a6d11a9483e6acc81f4800fc
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T15:09:49.480Z'
    finished_at: '2026-11-10T15:11:30.439Z'
    artifact_digest: 7ef32069e9cac3e04dd7545e7f8434b3adfc2ea531b14d1e2cbedf0838974a07
    contract_hash: 6907ef1dd1aafd78b6175964c54f50e6a3e16c4660bbf6b8ecf05d3c6f654bb4
    binding_hash: cbc27744ebd4da2132d3e9e0e851dc848334884678db844ade8172721a52912f
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
