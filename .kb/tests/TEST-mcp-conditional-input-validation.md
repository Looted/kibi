---
title: MCP conditional input validation tests
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a059665cf2bb7743dcf08e8b
    test_id: TEST-mcp-conditional-input-validation
    scope: end_to_end
    outcome: passed
    code_snapshot: df84fc91d0f807889519f20a576fcd787807fc96a14d6cb59f83a53eb62a9ce7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T07:51:06.675Z'
    finished_at: '2026-11-17T07:51:06.923Z'
    artifact_digest: df4a3670382a11cc1346f58fa45b0bf0952f8ea6c4c1f5cbf6a14dfa78e1ec61
    contract_hash: 5936fd5180e00a78f915f92902ea8b609f574c90156203cb039533e695442c15
    binding_hash: 8a4fd43b75e6118624380784158244b180d04db203670b5cf08c911df4638659
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
    kind: e2e
    evidence_level: tested
---
Converts the published kb_upsert inputSchema with the MCP converter and checks that observation, meta, subject, property_value and predicate facts with claim_text pass without claim_key, claim_key still requires claim_text, and the condition evaluator handles not, properties, enum, const, type, oneOf and boolean schemas (packages/mcp/tests/server/kb-upsert-claim-conditional.test.ts).

A false pass would be a test that builds its own schema instead of the published one; the suite reads the registered kb_upsert tool.