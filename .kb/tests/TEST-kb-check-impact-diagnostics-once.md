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
    receipt_id: PR-cd64a0fa9f29bb5739d04c07
    test_id: TEST-kb-check-impact-diagnostics-once
    scope: end_to_end
    outcome: passed
    code_snapshot: 12577d72464a9debc90aa9f72badf680997386a94cd2b4027dd9bb4122919390
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T15:12:18.416Z'
    finished_at: '2026-11-12T15:12:20.405Z'
    artifact_digest: 928df1f31524c37dce407f15281997ee538e7b8676349d0d9481d45c4e83e3f5
    contract_hash: 6ca8d56bcbd10968a3e0e38e0832bf7b096c51703fefde7535db5ab0036b2c7b
    binding_hash: 49a89e52046382293b5e5da25d34b1285916b45b421c9d19f9a88882be369620
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
