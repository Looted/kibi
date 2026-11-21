---
title: kb_prepare_impact_review returns compact, paged, named-evidence preparations
status: passing
priority: must
tags:
  - impact-policy
  - public-preparation
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-impact-review-compact-preparation
      target: default
  success_policy: all_required_first_attempt
id: TEST-impact-review-compact-preparation
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ba159fc0cd21925fc1775e93
    test_id: TEST-impact-review-compact-preparation
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 9edc60925b730af798bdd59cbd29c9c29eb9a0c8bd9df7ba4eef8b943f6794bd
    binding_hash: 4a96aa228af19be1aaa2e9eda2332d7504237a87930a3d4393cc1a35cb4c46f4
    fingerprint: 48e0ecf832e6c444d039d911ff8ddeb89f31210606dc5a42e4257fe6620b7bbf
    fingerprint_components:
      contract: 9edc60925b730af798bdd59cbd29c9c29eb9a0c8bd9df7ba4eef8b943f6794bd
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
      - symbol_id: SYM-test-impact-review-compact-preparation
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs kb_prepare_impact_review on real staged and diff Git repositories (packages/cli/tests/traceability/impact-review-preparation.test.ts): one row per captured file with its status, disposition, analysis status, requirement ids and pending obligations; each scoped requirement once with its before and after fingerprints; complete evidence and requirement context only for named paths, and a refusal for a path outside the inventory; an offset page that keeps the whole scope's fingerprint and file count with the requirements and obligations of its own rows; the authoring pointer to kb_author_impact_review and the kibi-commit-review schema resource, which equals the shipped schema. It runs the same projection against fixed inputs (packages/cli/tests/public-mutation/operations/impact-review-preparation.mutation.test.ts) and the rows cut of a large preparation through the shared fitter (packages/cli/tests/public/operations/result-budget.test.ts).

A false pass would be a test that reads only the first page or only named paths, so a preparation that drops files from the scope or repeats requirements per file still reads as complete.