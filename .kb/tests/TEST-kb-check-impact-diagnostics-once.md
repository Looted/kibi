---
title: kb_check lists each impact diagnostic once
status: passing
priority: must
tags:
  - integration
  - unit
verification_scope: integration
origin:
  kind: agent
  ref: 'Maintainer request, 2026-11-12, after the review of release 2026.11.2 reported the findings: "Well, can you make a PR with a hotfix then?" and "Yes, do all post review work in the hotfix."'
  recorded_at: '2026-11-12T14:09:28.873Z'
id: TEST-kb-check-impact-diagnostics-once
type: test
---
`packages/cli/tests/public-mutation/operations/check-format-shared.mutation.test.ts` asserts that a diagnostic the impact analysis reported is left out of `qualityDiagnostics` and of the quality section of the text while other quality diagnostics stay, and that impact diagnostics sharing a check, severity, files and suggestion are written under one suggestion. `packages/cli/tests/public/operations/migration-plan-coverage.test.ts` asserts that the review action of such a diagnostic names it by id and entity instead of copying it. It would pass falsely if the quality list held an equal copy rather than the reported object, so the fixture passes the same object in both lists as the check does.

Integration: `packages/mcp/tests/tools/check-impact.test.ts` calls the MCP `kb_check` handler with `sourceFiles` on a temporary workspace with a compiled KB and asserts that `multi_requirement_symbol_review` is under `impactDiagnostics` and not under `qualityDiagnostics`.
