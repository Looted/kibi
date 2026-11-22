---
title: Planned facts preview and hash-bound grounding plan on the decision-conflict fixture
status: passing
tags:
  - modeling
  - mutation
  - planning
  - search-lane
priority: must
text_ref: packages/cli/tests/consumer/planned-facts-what-if.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-model-what-if-planned-facts
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-11T19:12:34.512Z'
id: TEST-model-what-if-planned-facts
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3332fb7d40799a39f46993d9
    test_id: TEST-model-what-if-planned-facts
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 041ea1f4a7991159c8a8e92196cb1525d446fd3a5b08b9f7b589a60056304ffd
    binding_hash: d1c99a0280aac3dbfee3789ace49334ef6ee98db68f4a3c9198924277acf72b4
    fingerprint: 0320ea4495dc7f0870122b0920d4504dd162be55bb0ba98f5d3097a3fd75fad3
    fingerprint_components:
      contract: 041ea1f4a7991159c8a8e92196cb1525d446fd3a5b08b9f7b589a60056304ffd
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
      - symbol_id: SYM-test-model-what-if-planned-facts
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# Planned facts preview and hash-bound grounding plan on the decision-conflict fixture

In a fresh `kibi init` workspace with a stored allow permission_rule, `packages/cli/tests/consumer/planned-facts-what-if.test.ts` runs the built CLI: `kibi model` (mode predicates, complete bindings) for the ungrounded deny requirement returns a blocked kibi.compile-plan.v1 whose contradictionAnalysis names `Decision conflict on default:permission_rule(coach,read,unassigned_analysis_request)` and a warning saying so; `kibi upsert` dryRun of that requirement without `plannedFacts` fails on the missing fact, with `plannedFacts` it is refused with `Contradiction detected for requirement … (stage=contradiction_check, plannedFacts staged)` and the conflict reason; a real write with `plannedFacts` is rejected as dry-run only. For the assigned-requests requirement the plan is ready, the staged dry run is valid with `stagedFacts` and an empty `whatIf.introduced`, `kibi apply-plan` with the plan and its planHash applies both steps, the requirement keeps its ledger with the claim modeled and its body, and `kibi check` reports no domain-contradictions or logic-coverage violation for it.
