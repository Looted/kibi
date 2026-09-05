---
id: TEST-014
title: Verify Changesets-based release automation and fallback policy
status: passing
created_at: 2026-03-11T12:20:00.000Z
updated_at: 2026-04-21T00:00:00.000Z
source: documentation/tests/TEST-014.md
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
