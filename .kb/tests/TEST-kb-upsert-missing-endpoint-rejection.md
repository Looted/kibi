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
    receipt_id: PR-41d7cd09241e39dcb42ffb72
    test_id: TEST-kb-upsert-missing-endpoint-rejection
    scope: end_to_end
    outcome: passed
    code_snapshot: 841bececfb1194830ce8bb8340babcd8720338d2e4e0aa264db31001e436a4a7
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T13:38:53.158Z'
    finished_at: '2026-11-16T13:38:55.698Z'
    artifact_digest: b519dd87b268a1ce0c34d899dd51fdfba469c44c50cc884d733b09a3b96cd426
    contract_hash: 5cc4e8842418c6b63fe3e75305c500fefb18a1e9a0187d70f4d478e3210d9a4f
    binding_hash: f7aaab481c904c8c5a79e2d9344682595235c6e88dd8b9a0644ef83fe862495b
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