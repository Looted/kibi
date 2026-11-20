---
title: kibi migrate plans one review action for inline implements comments
status: passing
priority: must
tags:
  - migration
  - traceability
  - integration
  - e2e
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-11, to hard-drop inline implements comments; wording approved: "Ok"'
  recorded_at: '2026-11-11T05:47:32.064Z'
id: TEST-migrate-inline-implements-review
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-migrate-lists-inline-implements-comment
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-de439d6e0072dd0dbb1ec894
    test_id: TEST-migrate-inline-implements-review
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 728f986be08039af6a5ac9daf403f0e3d15bd4b75e275baa9d421a5129c51da0
    binding_hash: 154115c5f9c2d0da6b3a0463a9aefff5d628ab2a3c89d1f93489371ccbdad55e
    fingerprint: ada923858f11f3cd933023fe5eb144c1d6323197a66768859ec73a59fa4d7436
    fingerprint_components:
      contract: 728f986be08039af6a5ac9daf403f0e3d15bd4b75e275baa9d421a5129c51da0
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
      - symbol_id: SYM-e2e-migrate-lists-inline-implements-comment
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The packed consumer test `documentation/tests/e2e/packed/inline-implements-comments.test.ts` runs the installed `kibi migrate --format json` in a repository with one tracked commented source file and asserts one `review_inline_implements_comment` action with review safety, the file, the comment's line and ids, an empty `manifestLinked`, and that the source bytes are unchanged.

Unit coverage: `packages/cli/tests/commands/migrate-inline-implements.test.ts` runs `migrateCommand` with JSON output in a temporary Git workspace with one tracked commented source file and asserts the single review action, its evidence (file, line, ids, manifestLinked) and that the source bytes are unchanged; a second case deletes the comment and asserts no action. `packages/cli/tests/operations/migration/inline-implements-comments.test.ts` covers the comment syntaxes, tracked-only scanning and that the evidence lists every comment. It would pass falsely if the scan read untracked files, so the fixture stages the file with git add.
