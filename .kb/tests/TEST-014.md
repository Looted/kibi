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
    target: REQ-kibi-release-master-publishes-only
  - type: validates
    target: REQ-kibi-release-versioning-on-develop
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
    - symbol_id: SYM-e2e-release-package-contract
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0ef374db0b10f8317afd2bc6
    test_id: TEST-014
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 00728ebf10795ecaff5b8d4869fddfc4ec634a7c3fd1808e0e740582008b22ad
    binding_hash: bd2d4e937bddf57f08627bae041493c7ca29c4bb339b07410cebe26e7acc01af
    fingerprint: 6501445bb735f80ec0400e9a3b4673bea6862157b74a9cd4f5eee4e8f610a6de
    fingerprint_components:
      contract: 00728ebf10795ecaff5b8d4869fddfc4ec634a7c3fd1808e0e740582008b22ad
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
      - symbol_id: SYM-e2e-release-package-contract
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
