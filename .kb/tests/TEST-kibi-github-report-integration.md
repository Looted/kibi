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
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6a31fe75745e9be619858ec3
    test_id: TEST-kibi-github-report-integration
    scope: unit
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 5f1b42a89bcb45b30c59c92c47b8019ae77f53f9c5128053445da268175f8b04
    binding_hash: be10ce1bb998155463c55221941af16d3792ca7d56ec1fd08fe386fc3debd9bc
    fingerprint: 0532b868224ad936788ecc0879a256c324132a85970ae587b842d9f5ea258716
    fingerprint_components:
      contract: 5f1b42a89bcb45b30c59c92c47b8019ae77f53f9c5128053445da268175f8b04
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
      - symbol_id: SYM-e2e-packed-cli-github-report
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
