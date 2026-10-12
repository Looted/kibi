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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6e0c9c8b12716a45aeb2b26f
    test_id: TEST-model-what-if-planned-facts
    scope: end_to_end
    outcome: passed
    code_snapshot: 9f1686ef33b66e09e3bbf14b93c701d96fc812c10c403a32f3e9e704df269e55
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-11T19:13:49.644Z'
    finished_at: '2026-10-11T19:14:00.591Z'
    artifact_digest: 42806d21225c33d5a7a93ea0c873965ab08735e70404d18017017eb67f474fbd
    contract_hash: 041ea1f4a7991159c8a8e92196cb1525d446fd3a5b08b9f7b589a60056304ffd
    binding_hash: 13d1e2ec595792efa257b0567f0b234e7aa1a2b31fc667066193fd6802bdfbec
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
---
# Planned facts preview and hash-bound grounding plan on the decision-conflict fixture

In a fresh `kibi init` workspace with a stored allow permission_rule, `packages/cli/tests/consumer/planned-facts-what-if.test.ts` runs the built CLI: `kibi model` (mode predicates, complete bindings) for the ungrounded deny requirement returns a blocked kibi.compile-plan.v1 whose contradictionAnalysis names `Decision conflict on default:permission_rule(coach,read,unassigned_analysis_request)` and a warning saying so; `kibi upsert` dryRun of that requirement without `plannedFacts` fails on the missing fact, with `plannedFacts` it is refused with `Contradiction detected for requirement … (stage=contradiction_check, plannedFacts staged)` and the conflict reason; a real write with `plannedFacts` is rejected as dry-run only. For the assigned-requests requirement the plan is ready, the staged dry run is valid with `stagedFacts` and an empty `whatIf.introduced`, `kibi apply-plan` with the plan and its planHash applies both steps, the requirement keeps its ledger with the claim modeled and its body, and `kibi check` reports no domain-contradictions or logic-coverage violation for it.
