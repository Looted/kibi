---
title: Long-running bootstrap apply progress, async and recovery tests
status: passing
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6310797565972d8f10a9921a
    test_id: TEST-bootstrap-apply-long-running
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 439358821672d71f4ce8d63322a53f3c5a9d369427c9e1394695c22d1cad620a
    binding_hash: 337bebd385167b6d41230177132655b051f000981eab7768c39f13cac3e68098
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
    kind: e2e
    evidence_level: tested
---
Applies a real bootstrap plan in a temporary workspace with a filesystem that stops accepting journal writes after an action commits, which leaves the journal applying with an active action exactly like a killed process, plants a lock owned by a dead pid, and recovers with recoveryJournalId; it asserts per-action progress, the re-applied interrupted action, the reclaimed lock recorded in the journal and the refusals for live holders and unexplained drift (packages/cli/tests/operations/apply-plan-interrupted-recovery.test.ts). The MCP suite drives kb_apply_plan through the registration path to check notifications/progress and the async job receipt (packages/mcp/tests/server/kb-apply-plan-progress.test.ts).

A false pass would be a test that rewrites the journal before recovery; the suite never edits it.