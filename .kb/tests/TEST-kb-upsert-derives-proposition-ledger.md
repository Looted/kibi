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
    receipt_id: PR-e67d8863c6f2726b329d3f27
    test_id: TEST-kb-upsert-derives-proposition-ledger
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 949e4a1184f3f5ad435cf2b98477bbf44994d014829584c6360fd64161944c99
    binding_hash: eed787aa9453384b65cb54148c291a353f8a33d0b49394fde016779e858195f3
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
