---
title: Consumer CLI search answers with the governing requirement and what verifies it
status: passing
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - search
  - intent-search
  - answer-layer
  - discovery
  - e2e
id: TEST-kibi-search-answer-layer
type: test
priority: must
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-search-answer-layer
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-search-answer-layer
    target: default
    native_id: packages/cli/tests/consumer/search-answer-layer.test.ts::search answer layer through the kibi CLI::answers with the governing requirement, its facts, scenario and test, and lists the superseded one separately
    source_file: packages/cli/tests/consumer/search-answer-layer.test.ts
    line: 27
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-1c87d5b75e9c9baebef2af49
    test_id: TEST-kibi-search-answer-layer
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ddaab71cf19bb014696ada5289d3d8865791d7fa3692887622550b869d9ef15
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-03T10:03:22.997Z'
    finished_at: '2026-10-03T10:03:28.226Z'
    artifact_digest: 845e17336f7ed52a9313119d416cabf45b82ea1f4220508877cb3a6706fecda9
    contract_hash: 52dfb01c7e4dc38f26ff1b9e54d30afdc01c27a2bc244bf4c618063e49fbc02d
    binding_hash: 7dba465cc4efc5ba984a4334fd2ae3a45309fa552976fb6f1624dd398b87395f
    fingerprint: 6d3b396412511cef4fc75f49c8cefbffa9e7a482f03143ebe540937e4812bd59
    fingerprint_components:
      contract: 52dfb01c7e4dc38f26ff1b9e54d30afdc01c27a2bc244bf4c618063e49fbc02d
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 03e8a2949cab24f489b0e8ca6b3e61443d63bda5359607d4a61154f8be4b972b
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
---
# Consumer CLI search answers with the governing requirement and what verifies it

In a fresh `kibi init` workspace, `packages/cli/tests/consumer/search-answer-layer.test.ts` authors a current requirement with linked facts, scenario and test that supersedes an older requirement, then runs `kibi search` with default options: ranking is `intent-v1`, the superseded requirement is demoted below the current one, and `data.answer` (`kibi.search-answer.v1`) names the governing requirement with its facts, scenario and test, lists the superseded requirement under `notGoverning` with `supersededBy`, and a query that matches only an unowned note states that absence is not evidence.

`packages/cli/tests/search-answer.test.ts` and `packages/cli/tests/intent-search.test.ts` cover the answer builder and ranking directly.
