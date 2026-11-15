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
    receipt_id: PR-2577e86a0d1dbce92feec8c4
    test_id: TEST-mcp-upsert-proof-field-stubs
    scope: end_to_end
    outcome: passed
    code_snapshot: 751bc3383704c9470389626c26d1c61d744b1dc1ed35817ef9fd260075ac8ecc
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-15T18:32:49.174Z'
    finished_at: '2026-11-15T18:33:00.749Z'
    artifact_digest: 00940968765f8a32cc73805ef38362e9cc57fd0d5add61f0aeb3e5d3416bd6e9
    contract_hash: f97396d5c708389639276f478e351b8f7455dc0d0d1a27c695579ccde3cdf4ff
    binding_hash: e37124b6f2c5732bf127d7dc90d35ef803e01d31dce5b0385e574d9107597ff9
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