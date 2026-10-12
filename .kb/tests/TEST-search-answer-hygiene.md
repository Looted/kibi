---
title: 'Answer-layer hygiene: ungoverned top hits, linked ties, inherited source evidence and the check evaluation report'
status: passing
tags:
  - search
  - checks
  - search-lane
priority: must
text_ref: packages/cli/tests/consumer/check-evaluated.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-search-answer-hygiene
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-11T19:53:54.206Z'
id: TEST-search-answer-hygiene
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-96f543e7cf4e743fae280013
    test_id: TEST-search-answer-hygiene
    scope: end_to_end
    outcome: passed
    code_snapshot: 09cf85102d3ba6901db3ca0d929ce1a9dce997ca7c8927f0afde16374b62ccd3
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-11T20:01:00.952Z'
    finished_at: '2026-10-11T20:01:07.162Z'
    artifact_digest: 8ff8435352652d2c1f5a385cff011d7bd8cc2ea5f295a04786462bad1187d562
    contract_hash: f913941aabb08a027a8c8fd7a7273703cba182c449aad71efacd7d5a2f554b14
    binding_hash: f343f1b70e7bcf7b3b418ae458ba020b1cc2f73aa93e5cdb959c1175007c0b9c
    fingerprint: 7953753de099c33718227964b553f2c363f50b61455e44758a118a811ad08fbd
    fingerprint_components:
      contract: f913941aabb08a027a8c8fd7a7273703cba182c449aad71efacd7d5a2f554b14
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
      - symbol_id: SYM-test-search-answer-hygiene
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# Answer-layer hygiene: ungoverned top hits, linked ties, inherited source evidence and the check evaluation report

`packages/cli/tests/consumer/check-evaluated.test.ts` runs the built CLI in a fresh `kibi init` workspace: `kibi check` with `domain-contradictions` on the empty KB reports `evaluated.rules` and `factPairsExamined: 0`; with two requirements constraining the same quota subject it reports one compared pair alongside the contradiction, a check selecting only `required-fields` reports no pair count, and `kibi search` with `limit: 1` reports `returned: 1`, a larger `count` and `truncated: true`. `packages/cli/tests/search-answer.test.ts` builds the answer layer over a fixture graph: a top-ranked predicate fact no requirement owns is listed in `ungoverned` with rank 1, its `claim` and `ask`, the governing requirement reached through a lower-ranked scenario is kept, and the note leads with the ungoverned top match (alone, it also says absence is not evidence); an unlinked test below an owned requirement is listed with its rank. `packages/cli/tests/intent-search.test.ts` ranks a requirement tying with its own scenario as not ambiguous (`topRivalMargin` null) and the same tie with an unlinked requirement as ambiguous, and returns a requirement implemented by a source-located symbol without lexical overlap, with the reason `implemented at the source location` and a `sourceMatches` row naming the symbol at `distance: 3`, while the first pass without graph edges returns only the symbol.