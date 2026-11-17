---
title: kb_check lists each impact diagnostic once
status: passing
priority: must
tags:
  - integration
  - unit
verification_scope: end_to_end
origin:
  kind: agent
  ref: Post-release review of Kibi 2026.11.2, 2026-11-12
  recorded_at: '2026-11-12T14:09:28.873Z'
id: TEST-kb-check-impact-diagnostics-once
type: test
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-check-impact-diagnostics-once
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5daa796bc7f6bd1545647856
    test_id: TEST-kb-check-impact-diagnostics-once
    scope: end_to_end
    outcome: passed
    code_snapshot: df84fc91d0f807889519f20a576fcd787807fc96a14d6cb59f83a53eb62a9ce7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T07:50:20.093Z'
    finished_at: '2026-11-17T07:50:21.273Z'
    artifact_digest: d4c504d0833100291b5fdffccc901f0fc333545a2a7a247a5b8c1f122018ca6e
    contract_hash: 6ca8d56bcbd10968a3e0e38e0832bf7b096c51703fefde7535db5ab0036b2c7b
    binding_hash: e4de0d53c3e298f23f235598c9ab20007a1dfd8c24f49e09d956fbffab6ca20b
    fingerprint: ae049d747ec1f88447fcfb95f040e7359250c21bd26b9f8d7ba66597e14ba4d3
    fingerprint_components:
      contract: 6ca8d56bcbd10968a3e0e38e0832bf7b096c51703fefde7535db5ab0036b2c7b
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
      - symbol_id: SYM-test-kb-check-impact-diagnostics-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
`packages/cli/tests/public-mutation/operations/check-format-shared.mutation.test.ts` asserts that a diagnostic the impact analysis reported is left out of `qualityDiagnostics` and of the quality section of the text while other quality diagnostics stay, and that impact diagnostics sharing a check, severity, files and suggestion are written under one suggestion. `packages/cli/tests/public/operations/migration-plan-coverage.test.ts` asserts that the review action of such a diagnostic names it by id and entity instead of copying it. It would pass falsely if the quality list held an equal copy rather than the reported object, so the fixture passes the same object in both lists as the check does.

Integration: `packages/mcp/tests/tools/check-impact.test.ts` calls the MCP `kb_check` handler with `sourceFiles` on a temporary workspace with a compiled KB and asserts that `multi_requirement_symbol_review` is under `impactDiagnostics` and not under `qualityDiagnostics`.
