---
id: TEST-kibi-github-report-integration
title: GitHub badge, report init, and PR-vs-Pages workflow tests
status: active
tags:
  - cli
  - github
  - report
  - badge
  - init
  - unit
verification_scope: unit
verification_perspective: internal
links:
  - type: validates
    target: SCEN-kibi-github-report-integration
type: test
text_ref: packages/cli/tests/commands/github-init.test.ts
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-github-report
      target: default
  success_policy: all_required_first_attempt
---

# GitHub badge, report init, and PR-vs-Pages workflow tests

Validates `kibi init --github` and `--github --badge-only` option registration,
the `/kibi-report/` public path, canonical workflow scaffolding that does not
overwrite customized files, and that documented example workflows are
byte-identical to the packaged `kibi-cli` templates.

The github-init unit tests also lock the PR-vs-Pages contract: the report
template runs on `pull_request`, uploads `kibi-pr-report` from the generated
`kibi-report/` directory, skips Pages configure/upload/deploy on pull requests,
keeps `pages: write` and `id-token: write` on the deploy job only, and never
uses `pull_request_target`. `packages/cli/tests/commands/init.test.ts` asserts
`kibi init --github` writes that same PR-aware workflow.
