---
id: TEST-kibi-logical-requirement-coverage
title: Clause-complete logical requirement modeling tests
status: passing
created_at: 2026-08-04T00:00:00Z
updated_at: 2026-08-04T00:00:00Z
source: packages/core/tests/kb.plt
tags: [requirements, prolog, semantic-advisor, skillopt, unit, integration]
verification_scope: end_to_end
links:
  - type: validates
    target: SCEN-kibi-logical-requirement-coverage
---

Verifies stable clause keys, compound semantic-advisor receipts, merged modeling manifests, paired and hash-consistent claim provenance, manifest-to-ground-fact coverage, default rule activation, title-independent logical-debt diagnostics, exact predicate polarity contradictions, MCP contradiction rejection, MCP schema preservation of claim patterns, uniqueness, and conditional provenance, staged-overlay preservation of manifests, predicate fields, and verification metadata, final-state evidence normalization, and Skillopt logical-coverage scoring.

Executable coverage spans `packages/core/tests/kb.plt`, `packages/cli/tests/traceability/temp-kb.test.ts`, `packages/mcp/tests/semantic-advisor/analyze-prose.test.ts`, `packages/mcp/tests/server/tools.test.ts`, `packages/mcp/tests/tools/model-requirement.test.ts`, `packages/mcp/tests/tools/suggest-predicates.test.ts`, `packages/mcp/tests/tools/upsert-contradictions.test.ts`, the packed MCP parity tests, and the Skillopt evaluator tests.
