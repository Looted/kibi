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
    receipt_id: PR-4ff84fcdc8efbcf0fcd7b4ed
    test_id: TEST-vibe-hooks-decision-guard
    scope: end_to_end
    outcome: passed
    code_snapshot: 2957dd153b7c3ac878d465d66b09d5b9ebe77d619bf90923c72da1511a1fc89e
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-23T10:16:25.349Z'
    finished_at: '2026-11-23T10:16:25.559Z'
    artifact_digest: 22427ffbaa604c0cc629d5e4e0fffff17acf0f1ff3bd960af937860950886a76
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