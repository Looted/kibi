---
title: kibi-vibe decision guard tests
status: passing
priority: should
verification_scope: end_to_end
verification_perspective: internal
tags:
  - vibe
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-vibe-hooks-decision-guard
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-22T18:24:14.196Z'
id: TEST-vibe-hooks-decision-guard
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3c15de53c2dc934f29d75b37
    test_id: TEST-vibe-hooks-decision-guard
    scope: end_to_end
    outcome: passed
    code_snapshot: 79873135883ee7d25a5daa216900181efabbf9a965423ebfb7bc94193ace1938
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-22T18:44:06.242Z'
    finished_at: '2026-11-22T18:44:06.532Z'
    artifact_digest: 90ebe55d3742f3ebcb681dc551fd807cb2e0eaaa07a0165c92b96ea35c8b0f98
    contract_hash: 0f50b01b3a29263c9e5ac59ea29f4a9460681e20badcad92c9eb5773c5daf5f6
    binding_hash: 47237287f1919df997f371fd93d70a400cbd8b66429d984d705007ea05e4186a
    fingerprint: 44990e429548ef12ec0a06ceb3153b76a563b17dd294c427000182f8455de464
    fingerprint_components:
      contract: 0f50b01b3a29263c9e5ac59ea29f4a9460681e20badcad92c9eb5773c5daf5f6
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
      - symbol_id: SYM-test-vibe-hooks-decision-guard
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The `packages/vibe/tests/guard.test.mjs` suite: the rule note with its reason, the firm-requirement notice once per session after an edit, the rule-capture template, quiet reads, outside paths and `.kb` files, `KIBI_CONFIRM_FIRM_EDITS=0`, and the missing-git-hooks note.