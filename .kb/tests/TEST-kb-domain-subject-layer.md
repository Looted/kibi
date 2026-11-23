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
    receipt_id: PR-32b75cfc45c1ce538d21bf8a
    test_id: TEST-kb-domain-subject-layer
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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
