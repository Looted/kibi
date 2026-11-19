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
    receipt_id: PR-91286a5ae63632dbef93678d
    test_id: TEST-impact-review-compact-preparation
    scope: end_to_end
    outcome: passed
    code_snapshot: adea33e26c88941393a8c6226718a912bd53302a69d8e139fe10242571d2fb07
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-19T20:12:25.223Z'
    finished_at: '2026-11-19T20:12:28.829Z'
    artifact_digest: 354cab517519d3e298b73db3fa397701c2ca140de85a934deda33e4487f3f735
    contract_hash: 9edc60925b730af798bdd59cbd29c9c29eb9a0c8bd9df7ba4eef8b943f6794bd
    binding_hash: 1c1f0b1123850298b36859a88154bc092299c2fd0cd326aa81840c41a56f7b56
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