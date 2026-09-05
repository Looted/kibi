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
