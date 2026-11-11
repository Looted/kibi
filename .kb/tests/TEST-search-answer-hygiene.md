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
    receipt_id: PR-e74debec07624b77ccd5cf5a
    test_id: TEST-search-answer-hygiene
    scope: end_to_end
    outcome: passed
    code_snapshot: 216cfd98a14d6f9a06eb92c6fc15d752812ff64437317fb6a5c2ce92241c6a3e
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-11T17:40:28.722Z'
    finished_at: '2026-11-11T17:40:35.563Z'
    artifact_digest: a5b31cc0279212737fcd2d30cfebf97806333cd3c6f177f39d1d4ac34a5afe19
    contract_hash: f913941aabb08a027a8c8fd7a7273703cba182c449aad71efacd7d5a2f554b14
    binding_hash: 511841b1ca3f91df5c86efa80a927c10ab47d1aa6b6aad9a2a38198141a43397
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