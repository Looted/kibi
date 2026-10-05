---
id: TEST-014
title: Verify Changesets-based release automation and fallback policy
status: passing
created_at: 2026-03-11T12:20:00.000Z
updated_at: 2026-04-21T00:00:00.000Z
tags:
  - release
  - automation
  - changesets
  - verification
links:
  - type: validates
    target: REQ-020
  - type: validates
    target: SCEN-release-automation
  - ADR-014
  - FACT-034
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-014
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-33c769a82e4965b575925512
    test_id: TEST-014
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 20f81e810de5bee4cd769cdf7682dba0d74217a848e43a8058a234e4ae6ae2ab
    binding_hash: a8706b0e7faab9d469af9acba8fd365c9aaa0215f14e0a2331b97262421819e2
    fingerprint: 86012cca393ea9f65c2a56ebe46e37a699d4bd1af4330827a315f632a5a073d1
    fingerprint_components:
      contract: 20f81e810de5bee4cd769cdf7682dba0d74217a848e43a8058a234e4ae6ae2ab
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
      - symbol_id: SYM-e2e-test-014
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
# Test: Release Automation and Fallback Verification

## Scenario: Kibi docs sync successfully
1. Run: `kibi sync`
2. Run: `kibi check`
3. Assert exit code 0

## Scenario: KB fallback note exists
1. Search release docs for "KB query" or "fallback" or "unstable"
2. Assert note instructs agents to rely on docs if MCP lookup fails

## Scenario: Release workflow uses Changesets
1. Attempt to publish without Changesets: should fail
2. Attempt to publish with Changesets: should succeed
3. Changelog and version are updated automatically

## Coverage
- Automated guard: `scripts/tests/release-workflow-contract.test.ts` ensures checkout and fetch-depth semantics for publish workflow jobs

## Fallback Guidance
If KB query is unavailable or unreliable, maintainers and agents MUST consult REQ-020, ADR-014, and FACT-034 for authoritative release policy.
