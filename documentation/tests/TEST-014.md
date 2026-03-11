---
id: TEST-014
title: Verify Changesets-based release automation and fallback policy
status: pending
created_at: 2026-03-11T12:20:00Z
updated_at: 2026-03-11T12:20:00Z
source: documentation/tests/TEST-014.md
tags:
  - release
  - automation
  - changesets
  - verification
links:
  - REQ-020
  - ADR-014
  - FACT-034
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

## Fallback Guidance
If KB query is unavailable or unreliable, maintainers and agents MUST consult REQ-020, ADR-014, and FACT-034 for authoritative release policy.
