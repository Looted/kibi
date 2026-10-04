---
title: CLI integrity rules and failure contracts
status: passing
verification_scope: integration
verification_perspective: internal
tags:
  - test-quality
  - regression
  - internal
id: TEST-cli-check-integrity
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Runs packages/cli/tests/commands/check.test.ts and its check helper suites against isolated fixtures. Covers required fields, dangling references, cycles, strict fact/subject validation, contradictions, and must-priority coverage. Internal CLI/Prolog integration evidence, not a packaged consumer E2E claim.