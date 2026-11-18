---
title: Derived requirement ledger tests
status: passing
priority: must
tags:
  - mutation
  - modeling
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-15T20:20:22.434Z'
id: TEST-kb-upsert-derives-proposition-ledger
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-upsert-derives-proposition-ledger
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ff84a6e4aa6476292a938951
    test_id: TEST-kb-upsert-derives-proposition-ledger
    scope: end_to_end
    outcome: passed
    code_snapshot: ea01255979843eae1613367027b109d8dc1220b79358b0c0ad1b69430a2d532a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T18:16:51.439Z'
    finished_at: '2026-11-17T18:16:54.491Z'
    artifact_digest: 63acd314ff62746f752c3e9f5b7cdb45d882ac3105bd9c1885d22b94c4ab0d6b
    contract_hash: 949e4a1184f3f5ad435cf2b98477bbf44994d014829584c6360fd64161944c99
    binding_hash: 50e68aa7c27a6fc2e72737f38c4ee77279991e8a77df9976ad51c8938029b148
    fingerprint: 1b06231972020efb17df89e13c48b6e7dec17db1ef56060cb18cec5ad0e24e2f
    fingerprint_components:
      contract: 949e4a1184f3f5ad435cf2b98477bbf44994d014829584c6360fd64161944c99
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
      - symbol_id: SYM-test-kb-upsert-derives-proposition-ledger
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Derives the ledger for requirement writes that send no contract: claims recorded missing with the advisor's reading as a hint, the writer's own status and subjects kept, stored status and subjects kept across a prose change, an entry for an unstated claim refused, a sent contract field judged as sent, and which semantic_inventory values count as partial entries ({claim_key, status, subjects}) Kibi completes (packages/cli/tests/operations-mutation/mutation/requirement-semantics.test.ts). Runs the kb_validate_upsert and kb_apply_plan paths: a derived preview with inventoryApplied, partial semantic_inventory entries completed with the writer's status and subjects, a grounding link that names a claim recorded modeled, one that names no claim refused, and a partial contract still refused (packages/cli/tests/operations/mutation.test.ts, packages/cli/tests/operations/apply-plan-coverage.test.ts). Runs kibi upsert with partial entries through the built CLI, with and without dryRun (packages/cli/tests/consumer/upsert-review-lanes.test.ts). Checks that a committed MCP kb_upsert reports the advisor's verdict without its suggestions (packages/mcp/tests/tools/upsert-semantic-advisor.test.ts).

A false pass would be a test that only checks a write succeeds, so a derived ledger could record the advisor's guesses, or a modeled claim without its link, unnoticed.
