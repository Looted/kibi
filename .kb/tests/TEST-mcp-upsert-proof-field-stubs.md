---
title: kb_upsert proof field stub tests
status: passing
priority: must
tags:
  - mcp
  - mutation
  - validation
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-15T18:30:51.565Z'
id: TEST-mcp-upsert-proof-field-stubs
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-upsert-proof-field-stubs
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-91a2f26a361ec49f2500edfe
    test_id: TEST-mcp-upsert-proof-field-stubs
    scope: end_to_end
    outcome: passed
    code_snapshot: df84fc91d0f807889519f20a576fcd787807fc96a14d6cb59f83a53eb62a9ce7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T07:51:36.995Z'
    finished_at: '2026-11-17T07:51:47.347Z'
    artifact_digest: f444069d1d78943029ae67f88a409e4972056900a9a76f0702995d0ced403b42
    contract_hash: f97396d5c708389639276f478e351b8f7455dc0d0d1a27c695579ccde3cdf4ff
    binding_hash: 3433c8ab753e0a3937b9b971c8477ae5d8bd7ef78a59e1fdea92cd867482e73b
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
Lists the tools of a running MCP server and checks that kb_upsert advertises proof_contract, proof_bindings and proof_receipts as stubs with a type and a summary, that the kb_upsert tool and its input schema stay under their size budgets, and that a malformed proof_contract is refused on MCP and on the CLI JSON route with the same message, which names that field's full schema (packages/mcp/tests/server/tool-surface-consumer.test.ts). Unit tests cover the stub replacement and the schema hints for nested and unknown paths (packages/cli/tests/operations/advertised-schema.test.ts).

A false pass would be a test that reads a hand-built schema instead of the tools/list answer, or one that only checks the stub and never sends a call the full contract refuses.