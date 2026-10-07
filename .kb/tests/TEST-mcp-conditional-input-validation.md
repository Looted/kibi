---
title: MCP conditional input validation tests
status: active
priority: must
tags:
  - mcp
  - validation
  - facts
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-conditional-input-validation
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-07T12:27:20.575Z'
id: TEST-mcp-conditional-input-validation
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c18ce53738daa08806d55522
    test_id: TEST-mcp-conditional-input-validation
    scope: end_to_end
    outcome: passed
    code_snapshot: cc8892f6b26a6bce333fed4ab83d38c5adac2b6948a74264981d91f29d4edfb0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-07T12:45:45.442Z'
    finished_at: '2026-10-07T12:45:45.988Z'
    artifact_digest: f0d97eee3bad45ced2bedbeea72d4e5fd4f2856f14dddab73e96117574c52d8d
    contract_hash: 5936fd5180e00a78f915f92902ea8b609f574c90156203cb039533e695442c15
    binding_hash: 4bdaf7404b3b1f1f008380d96d29dbb43002f30c7cf20ab86078c3c68f3c0af5
    fingerprint: 4456179b364efd933a87b8d664061df1e6c607c6c415a8d1b8e6ec0563411d5b
    fingerprint_components:
      contract: 5936fd5180e00a78f915f92902ea8b609f574c90156203cb039533e695442c15
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
      - symbol_id: SYM-test-mcp-conditional-input-validation
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Converts the published kb_upsert inputSchema with the MCP converter and checks observation and meta facts with claim_text pass without claim_key, other fact kinds still require it, claim_key still requires claim_text, and the condition evaluator handles not, properties, enum, const, type, oneOf and boolean schemas (packages/mcp/tests/server/kb-upsert-claim-conditional.test.ts).

A false pass would be a test that builds its own schema instead of the published one; the suite reads the registered kb_upsert tool.