---
title: Host firm-edit receipt notice tests
status: passing
priority: should
tags:
  - hooks
  - codex
  - cursor
  - zcode
  - firmness
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T07:01:53.789Z'
id: TEST-agent-hosts-firm-edit-receipt-notice
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-hosts-firm-edit-receipt-notice
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a910984b22a3aa76bc6be627
    test_id: TEST-agent-hosts-firm-edit-receipt-notice
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b874d07340b68ce52925d0db2e1efd0d144d4a30d39495f7ae549d8fd48930
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-18T08:16:40.918Z'
    finished_at: '2026-11-18T08:18:04.556Z'
    artifact_digest: bc98da08a0416c3aa80a196b3c49be55840faff8d631b00a29c5dc60a93e1d5b
    contract_hash: 2f115ac7b5e77bc1b5569d42c92b4ee607aca6025ae0f3178139e06077da85b5
    binding_hash: 299362a402d137b87e599f78c0b3a0bad6afcc2aa3d9a685ab9dd4361de33d5e
    fingerprint: 95869d0a2e0f6ae4b35a44ec9b9a2035a10e61a2b9b58cb40917b89117bc9185
    fingerprint_components:
      contract: 2f115ac7b5e77bc1b5569d42c92b4ee607aca6025ae0f3178139e06077da85b5
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
      - symbol_id: SYM-test-agent-hosts-firm-edit-receipt-notice
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the Codex, Cursor and ZCode hook runners on a pre-edit event for code that implements a firm requirement and checks that the notice tells the agent to ask the person before breaking the rule and to record its verdict with kibi review-firm-edit, once per requirement per session, and that a keeps receipt committed in an earlier session does not stop the notice in a new session (packages/codex/tests/hook-runner.test.ts, packages/cursor/tests/hook-runner.test.ts, packages/zcode/tests/hook-runner.test.ts). The decision guard tests check the notice text, and the receipt tests check that a receipt counts only when it was recorded after the session asked (packages/agent-core/tests/decision-guard.test.ts, packages/agent-core/tests/firm-edit-review.test.ts).

A false pass would be a host test that writes a receipt for different code than it edits, so the notice shows for the wrong reason.