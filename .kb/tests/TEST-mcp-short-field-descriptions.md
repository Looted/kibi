---
title: Short MCP field description tests
status: passing
priority: must
tags:
  - mcp
  - skills
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T06:40:06.239Z'
id: TEST-mcp-short-field-descriptions
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-short-field-descriptions
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-731c47b2d766fef8d3a92bb6
    test_id: TEST-mcp-short-field-descriptions
    scope: end_to_end
    outcome: passed
    code_snapshot: 922722505874a39bf824680c85dc86f0274e2312643033c33145a58404c54cae
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T18:37:54.977Z'
    finished_at: '2026-11-16T18:38:05.976Z'
    artifact_digest: f708ea54e33afcc42e8478ff9879e247e7ba7486f2ce88558a5f77822a4e469d
    contract_hash: cf7fe8e335ef2c4d6f067e3b1b48a1df17e51c827bb29d889f40e794b6eb1915
    binding_hash: 3abb8ae8cb123cd948a88387f6e27fb95732d6f8955df805f6d65d1dff24d773
    fingerprint: 9e94eeb80e90485cc4baa597f8a1acf8dec88b1dfde4319f312113412e65b638
    fingerprint_components:
      contract: cf7fe8e335ef2c4d6f067e3b1b48a1df17e51c827bb29d889f40e794b6eb1915
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
      - symbol_id: SYM-test-mcp-short-field-descriptions
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Lists the tools of a running MCP server and checks that every description in every advertised input schema is at most 120 characters, and that the tools stay under their size budgets (packages/mcp/tests/server/tool-surface-consumer.test.ts). Unit tests check that a field's advertised description replaces its full one, that string-constant unions are advertised as enums, and that every catalog field stays within the limit (packages/cli/tests/operations/advertised-schema.test.ts). The field reference tests check that every shortened field is listed with its full description, and that the copy of resources/operation-fields.md in each kibi-usage skill mirror equals the reference generated from the catalog, so kb_skills serves current text (packages/cli/tests/operations/field-reference.test.ts).

A false pass would be a limit check that reads a hand-built schema instead of the tools/list answer, or a reference test that never compares the shipped file with the catalog.