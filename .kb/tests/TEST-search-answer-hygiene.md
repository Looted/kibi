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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b879b67cc657f7f924a60acc
    test_id: TEST-search-answer-hygiene
    scope: end_to_end
    outcome: passed
    code_snapshot: 4b66676736e4ffd3d568ebd40c071d55c0a0c605ee2bb57b0941bd7a509e70d6
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-25T19:49:35.551Z'
    finished_at: '2026-11-25T19:50:28.875Z'
    artifact_digest: 4385d3b873dc5e5fa37118b6ec3f1ceb9bd6dc73debcac5e51ef83c597eddc10
    contract_hash: f913941aabb08a027a8c8fd7a7273703cba182c449aad71efacd7d5a2f554b14
    binding_hash: e15c162eb3b5bb05fc3354ab52a1e832e00adba4e714392b1a8af59f1ef1aa8f
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
    kind: e2e
    evidence_level: tested
---
# Answer-layer hygiene: ungoverned top hits, linked ties, inherited source evidence and the check evaluation report

`packages/cli/tests/consumer/check-evaluated.test.ts` runs the built CLI in a fresh `kibi init` workspace: `kibi check` with `domain-contradictions` on the empty KB reports `evaluated.rules` and `factPairsExamined: 0`; with two requirements constraining the same quota subject it reports one compared pair alongside the contradiction, a check selecting only `required-fields` reports no pair count, and `kibi search` with `limit: 1` reports `returned: 1`, a larger `count` and `truncated: true`. `packages/cli/tests/search-answer.test.ts` builds the answer layer over a fixture graph: a top-ranked predicate fact no requirement owns is listed in `ungoverned` with rank 1, its `claim` and `ask`, the governing requirement reached through a lower-ranked scenario is kept, and the note leads with the ungoverned top match (alone, it also says absence is not evidence); an unlinked test below an owned requirement is listed with its rank. `packages/cli/tests/intent-search.test.ts` ranks a requirement tying with its own scenario as not ambiguous (`topRivalMargin` null) and the same tie with an unlinked requirement as ambiguous, and returns a requirement implemented by a source-located symbol without lexical overlap, with the reason `implemented at the source location` and a `sourceMatches` row naming the symbol at `distance: 3`, while the first pass without graph edges returns only the symbol.