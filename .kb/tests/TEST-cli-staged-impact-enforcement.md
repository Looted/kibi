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
    - symbol_id: SYM-e2e-test-cli-staged-impact-enforcement
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-90f55887a75376883acfc50c
    test_id: TEST-cli-staged-impact-enforcement
    scope: end_to_end
    outcome: passed
    code_snapshot: 1525e26386be688f0153859837e8864169cd0c2608dba36204dcab4f0d708d54
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:58:16.846Z'
    finished_at: '2026-10-28T19:00:15.768Z'
    artifact_digest: deec61e59c1951b1892b528bde657c43dca1d95022611cdc205bb52b6e5df206
    contract_hash: e1e9ade4b078a6b34f6005c64386bb2e452b3f364c566248bf2e7180cac23eaf
    binding_hash: 5a08a14be933d634b5b3ca63dc01fb9b97089e1b5d0033b6d68a9a169a20a21c
    fingerprint: 2abf545e3d1cfb4da708934f33f4bf225ce38cecf4110428865cb2cc43b582de
    fingerprint_components:
      contract: e1e9ade4b078a6b34f6005c64386bb2e452b3f364c566248bf2e7180cac23eaf
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
      - symbol_id: SYM-e2e-test-cli-staged-impact-enforcement
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
