---
title: An edit that only deletes dead implements comments is not put to the person
status: passing
priority: must
tags:
  - integration
  - unit
verification_scope: end_to_end
origin:
  kind: agent
  ref: Post-release review of Kibi 2026.11.2, 2026-11-12
  recorded_at: '2026-11-12T14:09:27.096Z'
id: TEST-dead-implements-comment-deletion
type: test
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-dead-implements-comment-deletion
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4167302f52cad0defcf92812
    test_id: TEST-dead-implements-comment-deletion
    scope: end_to_end
    outcome: passed
    code_snapshot: 12577d72464a9debc90aa9f72badf680997386a94cd2b4027dd9bb4122919390
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T15:12:06.959Z'
    finished_at: '2026-11-12T15:12:09.124Z'
    artifact_digest: 46eb0ecafbf53cb29373612d6f0c31386b82fbdcb38d5332a8fca29265dd52e5
    contract_hash: f1313476f4d4a8ca37bff36d6036530aee98dae43bdbbcae41a6e4ff65ccb7f9
    binding_hash: ad804018ecb5f38e2902eb2b678eb2420a9d487ea462d6e14b7defcf6e88a690
    fingerprint: efb8f10599d515dd8dd265eb653cbe42a5cde3b113f198f8b43988818d646483
    fingerprint_components:
      contract: f1313476f4d4a8ca37bff36d6036530aee98dae43bdbbcae41a6e4ff65ccb7f9
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
      - symbol_id: SYM-test-dead-implements-comment-deletion
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
`packages/agent-core/tests/decision-guard.test.ts` asserts which lines count as a dead implements comment and that an edit, a list of edits, a whole-file write and an `apply_patch` edit are recognised only when every removed line is such a comment and nothing else changes. For a patch only the `Update File` section for the edited file counts, matched by its path; it must remove at least one line and add none, and a patch that adds, deletes or moves the file, or that is not one well-formed envelope, is never recognised. `packages/claude/tests/hook-runner.test.ts` asserts that the Claude Code hook does not ask for a comment-only deletion in a file a firm requirement governs and still asks when the same edit also changes code; `packages/codex/tests/hook-runner.test.ts` and `packages/zcode/tests/hook-runner.test.ts` assert the same for an `apply_patch` edit through the Codex and ZCode firm-edit notices. It would pass falsely if the file were not governed by a firm requirement, so the second case uses the same file.

Integration: the hook cases drive the real hook runners with PreToolUse events against a temporary workspace that holds a KB and the source file, so the decision guard, the manifest lookup and the hook output are exercised together.
