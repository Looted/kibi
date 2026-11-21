---
title: Missing relationship endpoint rejection tests
status: passing
priority: must
tags:
  - mutation
  - relationships
  - telemetry
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T13:34:01.250Z'
id: TEST-kb-upsert-missing-endpoint-rejection
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-upsert-missing-endpoint-rejection
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-13b0da15a87f5ff428a44b2e
    test_id: TEST-kb-upsert-missing-endpoint-rejection
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 5cc4e8842418c6b63fe3e75305c500fefb18a1e9a0187d70f4d478e3210d9a4f
    binding_hash: 2007c8c45df65ff48280905de1c5ab4d1959be813307d6fd45bb3a2a72c76edb
    fingerprint: 34ee44ded61fce6e7c8d2f0992bc8a24d39f5ed6abbad54f86141b3c354bd2b7
    fingerprint_components:
      contract: 5cc4e8842418c6b63fe3e75305c500fefb18a1e9a0187d70f4d478e3210d9a4f
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
      - symbol_id: SYM-test-kb-upsert-missing-endpoint-rejection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The contradiction tests (packages/cli/tests/operations-mutation/mutation/contradictions.test.ts) feed upsertFailure the structured store errors for a missing source and a missing target endpoint and assert a RELATIONSHIP_ENDPOINT_MISSING rejection whose message names the entity, its role and the two fixes (create it first or write both in one kb_apply_plan), while a missing entity outside a relationship stays an ordinary failure. The Prolog error-term tests (packages/cli/tests/prolog/error-terms.test.ts) assert the existence errors the store throws parse into entity_not_found records with the source or target role.

A false pass would be a test that only checks the message text, never that the error is a rejection, since telemetry counts any other error as a Kibi fault.