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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-bd173c091b4830a1c1f42b3d
    test_id: TEST-cli-staged-impact-enforcement
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: e1e9ade4b078a6b34f6005c64386bb2e452b3f364c566248bf2e7180cac23eaf
    binding_hash: aed290f7c6f821feb3a54d322912da9a244fc5e494e8216a97e369a1ea7938c3
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
