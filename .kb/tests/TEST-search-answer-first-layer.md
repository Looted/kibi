---
title: Search answer statement, reason source and compact evidence tests
status: passing
priority: must
tags:
  - search
  - answer
  - progressive-disclosure
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-search-answer-layer
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T15:41:23.963Z'
id: TEST-search-answer-first-layer
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a0da8f59e133ec220123a63b
    test_id: TEST-search-answer-first-layer
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 52dfb01c7e4dc38f26ff1b9e54d30afdc01c27a2bc244bf4c618063e49fbc02d
    binding_hash: 66e78e9fd1dd4c607b38ac278cd51c8d5d73c39b7caf8a81dbbc33bf0eb9b447
    fingerprint: 91f91298196d96e55a13d2c41a78833837832da7e4e53823ca35c05bcae96586
    fingerprint_components:
      contract: 52dfb01c7e4dc38f26ff1b9e54d30afdc01c27a2bc244bf4c618063e49fbc02d
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
      - symbol_id: SYM-test-kibi-search-answer-layer
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs kibi search through the built CLI on a workspace whose governing requirement has a body statement, a Why section and an origin with an approver and date, and checks the entry's statement and why.said, that results carry no graph paths and facts no kb_query call by default, and that fields full brings both back while abstained and ambiguous stay (packages/cli/tests/consumer/search-answer-layer.test.ts). Unit tests in packages/cli/tests/search-answer.test.ts cover the statement sources and the 300-character cut, who a reason came from for each origin kind, the shrink order, and the summary and full detail of fact calls; packages/cli/tests/public-mutation/operations/discovery-search.mutation.test.ts covers the executor passing the detail and dropping graph paths.

A false pass would be a fixture whose requirements have no origin and no linked facts, so said and the dropped kb_query calls are never exercised.