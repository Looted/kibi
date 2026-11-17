---
title: kb_upsert advertises the 15 capture fields and the field reference lists the rest
status: passing
priority: must
tags:
  - tool-surface
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-upsert-proof-field-stubs
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
id: TEST-mcp-upsert-capture-fields
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7423db10d8ab5741af807209
    test_id: TEST-mcp-upsert-capture-fields
    scope: end_to_end
    outcome: passed
    code_snapshot: df84fc91d0f807889519f20a576fcd787807fc96a14d6cb59f83a53eb62a9ce7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T07:51:22.447Z'
    finished_at: '2026-11-17T07:51:34.552Z'
    artifact_digest: 514949012e7aedf66a9df31385553b8cc5a4997dacbabf473fc797d33652fb9b
    contract_hash: f97396d5c708389639276f478e351b8f7455dc0d0d1a27c695579ccde3cdf4ff
    binding_hash: c20051b9f31385d933f59a1be7bc61df9521f094447d6354dc2ea68d5cf073a4
    fingerprint: 6ba62ec0f32810ed00ed0297cd697de7fc4bb0ab0c98d037a47b1c110dea743f
    fingerprint_components:
      contract: f97396d5c708389639276f478e351b8f7455dc0d0d1a27c695579ccde3cdf4ff
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
      - symbol_id: SYM-test-mcp-upsert-proof-field-stubs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Asserts that advertisedInputSchema keeps only the properties an x-kibi-advertised-fields marker names and drops the marker (packages/cli/tests/operations/advertised-schema.test.ts), that the field reference lists the left-out fields with their descriptions (field-reference.test.ts), that the MCP kb_upsert definition advertises exactly the 15 capture fields (packages/mcp/tests/server/tools-coverage.test.ts), and the kb_upsert input-schema budget (tool-surface-consumer).