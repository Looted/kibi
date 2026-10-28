---
id: TEST-mcp-semantic-advisor-preflight
title: MCP semantic advisor preflight tests
status: passing
created_at: 2026-06-07T00:00:00.000Z
updated_at: 2026-06-07T00:00:00.000Z
source: packages/mcp/tests/semantic-advisor/analyze-prose.test.ts
tags:
  - mcp
  - semantic-advisor
  - modeling
  - unit
links:
  - type: validates
    target: SCEN-mcp-semantic-advisor-preflight
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-semantic-advisor-preflight
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-59b2efd10d63cf347619ed60
    test_id: TEST-mcp-semantic-advisor-preflight
    scope: end_to_end
    outcome: passed
    code_snapshot: 5dbf5378436c37c75e9104c48b222f0ae984ea474679ffbc2c4a8878882ee3ad
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:15:30.569Z'
    finished_at: '2026-10-28T19:16:55.620Z'
    artifact_digest: 8c779b2963234e06326433ffe86f6332877051fe8461064b09be8869476ea8c9
    contract_hash: b22e438697050dacc5a176dfb0343dafc36dcd17fdb5635a989e8d0d83228e01
    binding_hash: 7598bc546e527c53a84756355579cde7c170bb2878ec7d63f92f8cbec17cf19c
    fingerprint: 04ed587c011c3db1b89314cf73d655a0c863df6be0e09698a39bb6f0209a1bea
    fingerprint_components:
      contract: b22e438697050dacc5a176dfb0343dafc36dcd17fdb5635a989e8d0d83228e01
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
      - symbol_id: SYM-e2e-test-mcp-semantic-advisor-preflight
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies deterministic semantic advisor signal detection, modeling suggestions, ambiguity witnesses, receipt hashing, standalone `kb_semantic_advisor` behavior, `kb_validate_upsert` preflight warnings, and successful `kb_upsert` advisory receipts for prose-heavy requirements.
