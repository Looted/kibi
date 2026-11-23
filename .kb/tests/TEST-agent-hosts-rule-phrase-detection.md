---
title: Rule phrase detection tests
status: passing
priority: must
tags:
  - hooks
  - agent-core
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-15T18:53:00.751Z'
id: TEST-agent-hosts-rule-phrase-detection
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-hosts-rule-phrase-detection
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7baf7f99ade138de00bea567
    test_id: TEST-agent-hosts-rule-phrase-detection
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: ece754f2da91092e32cfd2789f6009ad5c877be637defc9c36c873cb818dcf7c
    binding_hash: 1fcd577fccef964b08698c80d944aa5e5ca81996e1763055d42e67e132129d1c
    fingerprint: 44073919036ec508fd8f1057e67f710a78e507a11a3d23bbf076f0ad4cae3ef4
    fingerprint_components:
      contract: ece754f2da91092e32cfd2789f6009ad5c877be637defc9c36c873cb818dcf7c
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
      - symbol_id: SYM-test-agent-hosts-rule-phrase-detection
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the shared rule detector every host hook uses on prompts with deontic phrases, with never and always as instructions (at the start of a clause, after and, but, so, then or please, after make sure or ensure), with never and always describing current behavior, with questions that are and are not requests, and with rule words inside fenced and inline code (packages/agent-core/tests/decision-guard.test.ts).

A false pass would be a test that checks only prompts the old phrase list already caught, so a descriptive never could still read as a rule unnoticed.