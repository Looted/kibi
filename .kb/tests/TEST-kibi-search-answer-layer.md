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
  - verdicts
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
    line: 35
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-aa19e463046c3b2aa42b1511
    test_id: TEST-kibi-search-answer-layer
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 52dfb01c7e4dc38f26ff1b9e54d30afdc01c27a2bc244bf4c618063e49fbc02d
    binding_hash: 1e457539e28da2c90b423ba38437b49bbed89268b73f50124529cf09e6aadc6d
    fingerprint: c84ab24c8968f68c7ebe4db38392d96fe1212deb5f9f34d2e8f0e3b9da9871e2
    fingerprint_components:
      contract: 52dfb01c7e4dc38f26ff1b9e54d30afdc01c27a2bc244bf4c618063e49fbc02d
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 396029d7ee0505bfd7abc61bf2fa2eff6c1963dd6635e853d5dfdcdd240affff
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# Consumer CLI search answers with the governing requirement and what verifies it

In a fresh `kibi init` workspace, `packages/cli/tests/consumer/search-answer-layer.test.ts` authors a current requirement with linked facts, scenario and test that supersedes an older requirement, then runs `kibi search` with default options: ranking is `intent-v1`, the superseded requirement is demoted below the current one, and `data.answer` (`kibi.search-answer.v1`) names the governing requirement with its facts, scenario and test, lists the superseded requirement under `notGoverning` with `supersededBy`, and a query that matches only an unowned note states that absence is not evidence.

`packages/cli/tests/search-answer.test.ts` and `packages/cli/tests/intent-search.test.ts` cover the answer builder and ranking directly.
