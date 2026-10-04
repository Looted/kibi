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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-0c0853cecfe3344f8abe2507
    test_id: TEST-mcp-semantic-advisor-preflight
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: b22e438697050dacc5a176dfb0343dafc36dcd17fdb5635a989e8d0d83228e01
    binding_hash: ce1be0d5fdccb29d8be8f41f4f5885da281ad1d8ced0b1d4ff45c8dda2993772
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies deterministic semantic advisor signal detection, modeling suggestions, ambiguity witnesses, receipt hashing, standalone `kb_semantic_advisor` behavior, `kb_validate_upsert` preflight warnings, and successful `kb_upsert` advisory receipts for prose-heavy requirements.
