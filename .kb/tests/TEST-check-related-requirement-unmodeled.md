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
    receipt_id: PR-33d40227e1052ffbb9ab6914
    test_id: TEST-check-related-requirement-unmodeled
    scope: end_to_end
    outcome: passed
    code_snapshot: 6fd9a4bfa27027cd64e725c78e092bacee0c8b3d904976a0536b8181d7871dd0
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-13T07:26:18.796Z'
    finished_at: '2026-11-13T07:26:33.511Z'
    artifact_digest: a580049977b90e39b4b1c6e310370fef2ccf04a4a306ade2c846cf9512a33cff
    contract_hash: e73ace1f60266e662ffc556fb0fda57f85e52802f13951c19de1e2929c48d4ca
    binding_hash: 75ef8e7f6840b21d6a197e13e3753b9189cbfb6c7a4545ef7ae7f61dea5c9310
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