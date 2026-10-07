---
title: Long-running bootstrap apply progress, async and recovery tests
status: active
priority: must
tags:
  - bootstrap
  - mcp
  - recovery
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-bootstrap-apply-long-running
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-07T12:27:57.910Z'
id: TEST-bootstrap-apply-long-running
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6023ab33e9f4f6a2ccf11932
    test_id: TEST-bootstrap-apply-long-running
    scope: end_to_end
    outcome: passed
    code_snapshot: cc8892f6b26a6bce333fed4ab83d38c5adac2b6948a74264981d91f29d4edfb0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-07T12:45:54.165Z'
    finished_at: '2026-10-07T12:45:55.324Z'
    artifact_digest: 46fe04de8c03b3488e600dfb5afe494552cbd566bd9b27905905cf930e749fe2
    contract_hash: 439358821672d71f4ce8d63322a53f3c5a9d369427c9e1394695c22d1cad620a
    binding_hash: 05c2e4c1df5d9121020736e96c05340f4458e917439e9fa2d053eb5d355d90db
    fingerprint: 9da9d2d478268fc2b788909e61c6e87e06742d5290aa6315863c574712d99775
    fingerprint_components:
      contract: 439358821672d71f4ce8d63322a53f3c5a9d369427c9e1394695c22d1cad620a
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
      - symbol_id: SYM-test-bootstrap-apply-long-running
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Applies a real bootstrap plan in a temporary workspace with a filesystem that stops accepting journal writes after an action commits, which leaves the journal applying with an active action exactly like a killed process, plants a lock owned by a dead pid, and recovers with recoveryJournalId; it asserts per-action progress, the re-applied interrupted action, the reclaimed lock recorded in the journal and the refusals for live holders and unexplained drift (packages/cli/tests/operations/apply-plan-interrupted-recovery.test.ts). The MCP suite drives kb_apply_plan through the registration path to check notifications/progress and the async job receipt (packages/mcp/tests/server/kb-apply-plan-progress.test.ts).

A false pass would be a test that rewrites the journal before recovery; the suite never edits it.