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
    receipt_id: PR-39044d3977694e332d055d94
    test_id: TEST-kb-domain-subject-layer
    scope: end_to_end
    outcome: passed
    code_snapshot: 3fc3e2e3094efa2eabfd7872c20abdb5da6945a5aded8e7f85434893b7a4f29c
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T20:32:34.943Z'
    finished_at: '2026-11-12T20:32:45.999Z'
    artifact_digest: 708445580c1def2d563f385301692441bd2c227eb8e1a2a7c0964b80a6a17284
    contract_hash: 7b76e3df4394f5214cedf5c1ad0aff6741365f16e02f976877ba2d3b110b4931
    binding_hash: d2e76a48058e7b5196f392826d3d83f876786b98eb34cfe19c972d4cdb0a837e
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
