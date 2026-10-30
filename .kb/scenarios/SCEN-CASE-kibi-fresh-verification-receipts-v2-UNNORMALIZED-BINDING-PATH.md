---
title: A receipt binds a source file spelled with ./, doubled separators, backslashes or an absolute path by its repository-relative path
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:04:13.732Z'
id: SCEN-CASE-kibi-fresh-verification-receipts-v2-UNNORMALIZED-BINDING-PATH
type: scenario
---
Given a proof-bearing test whose required symbol's source file the symbol manifest spells as ./src/pay.mjs, src//./pay.mjs, src\pay.mjs or an absolute path inside the checkout, when kibi prove records a passing receipt, then its binding hash is the same as for src/pay.mjs, and it changes once that file's contents change.

This covers one violating item past the invariant, `gt 0` on `binding_paths_not_repo_relative`: each unnormalized spelling is reduced to the repository-relative path before it is bound. packages/cli/tests/consumer/proof-receipt-compaction.test.ts "a receipt binds a symbol's source file by its repository-relative path, however the manifest spells it" exercises it through kibi sync and kibi prove.
