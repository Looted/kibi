---
title: related-requirement-unmodeled pair and pair review tests
status: passing
priority: must
tags:
  - checks
  - contradictions
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-related-requirement-unmodeled
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-07T13:24:04.730Z'
id: TEST-check-related-requirement-unmodeled
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-523867fb9cb9380b7f454b2c
    test_id: TEST-check-related-requirement-unmodeled
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e73ace1f60266e662ffc556fb0fda57f85e52802f13951c19de1e2929c48d4ca
    binding_hash: e881e253e00e31bdf411ae90e295591204eea1f3ab68b6e4b1124ed31a5b9b8a
    fingerprint: 9e932ecc415ede74275090d026138cd473a2a67f922e5a10c4f78eab84ee684c
    fingerprint_components:
      contract: e73ace1f60266e662ffc556fb0fda57f85e52802f13951c19de1e2929c48d4ca
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
      - symbol_id: SYM-test-check-related-requirement-unmodeled
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the consumer test `packages/cli/tests/consumer/related-requirement-unmodeled.test.ts` through the built CLI on a temporary Git workspace. A new must requirement whose normative claims are left `missing` and linked with relates_to to a modeled quota requirement is reported by the default `kibi check` run; a no_conflict verdict without separated_by, one that leaves a claim out, an agent's verdict without approved_by and a conflict verdict all keep it reported, and an approved, complete verdict or a supersedes link clears it. A second workspace leaves the claims as ontology_gap entries naming the quota subject with no link: the shared subject pairs them, a verdict without a relates_to edge does not count, and adding the edge settles the pair. The Prolog suites in `packages/core/tests/domain_subjects.plt` and `packages/core/tests/kb.plt` cover each review problem, interacts resolvers, decisive pairs and the finding text.

A false pass would be a check that never pairs the requirements; the test therefore expects the findings it should get at each step before it expects none.