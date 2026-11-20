---
title: Domain subject definitions, claim anchors, domain view and migration tests
status: passing
priority: must
tags:
  - kb
  - domain-subjects
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-domain-subject-layer
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-12T20:00:00.000Z'
id: TEST-kb-domain-subject-layer
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b12702c1273e02fa615c7edd
    test_id: TEST-kb-domain-subject-layer
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 7b76e3df4394f5214cedf5c1ad0aff6741365f16e02f976877ba2d3b110b4931
    binding_hash: c61b951693ae750b15d99a21dadcdc9d2c4438595e2c49cd576b8bd747c62835
    fingerprint: 7bbf0896b0d6db917c696584f03159f8f0af8f87055b732325431442a224614f
    fingerprint_components:
      contract: 7b76e3df4394f5214cedf5c1ad0aff6741365f16e02f976877ba2d3b110b4931
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
      - symbol_id: SYM-test-kb-domain-subject-layer
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the real `kibi` CLI on a temporary Git workspace (packages/cli/tests/consumer/domain-subjects.test.ts): two prose requirements whose claims name one subject, `kibi query` of the subject's domain view and of its broader subject, `kibi check --rules claim-subject-missing,claim-subject-undefined,subject-definition-missing,subject-duplicate` before and after an unanchored claim and a claim on an undefined subject, `kibi migrate --format json` and `--apply-safe` with and without `--approved-action claim-subject-anchor-<id>`, and a `kibi upsert` of a requirement on the subject whose result names the requirements already on it. Unit suites cover the definition, template and duplicate rules, the anchor edit and the migration actions.

A false pass would be a check that reports nothing because the rules never ran; the test therefore also expects the findings it should get (the unanchored claim and the undefined subject), and expects the unapproved apply to leave the requirement file byte for byte unchanged.
