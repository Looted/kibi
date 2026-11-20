---
title: The repository search gate run against a CLI-built KB passes a met gold set and fails closed on a missed threshold
status: passing
priority: must
tags:
  - evaluation
  - search
  - gold-set
  - ci
  - latency
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-search-gold-set-gate-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-search-gold-set-gate-cli
    target: default
    native_id: scripts/tests/repo-search-gold-gate.test.ts::repository search gold-set gate (end to end)::a gold set the KB answers passes with every metric printed
    source_file: scripts/tests/repo-search-gold-gate.test.ts
    line: 275
origin:
  kind: agent
  recorded_at: '2026-10-04T04:47:44.593Z'
id: TEST-kibi-search-gold-set-gate-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-68a66665323ab3abc7147fbe
    test_id: TEST-kibi-search-gold-set-gate-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 8507fa19c333fabdae82aac482be0db8d93b20c76888dc56668f6175efdf36f2
    binding_hash: 8e539d40a59359427ff6aaac40f4cdb6ec8837c15b8fd29d259c1b430ddb7068
    fingerprint: 0951b3758c3d49f7b36f0581ab94f8552baf12a3fb41db3e928320eda64de1c0
    fingerprint_components:
      contract: 8507fa19c333fabdae82aac482be0db8d93b20c76888dc56668f6175efdf36f2
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 50635bae4cac172aa95d5856821d377dfc06ac1ef04d777636f88993f9813836
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-search-gold-set-gate-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# The repository search gate run against a CLI-built KB passes a met gold set and fails closed on a missed threshold

Runs `scripts/change-to-proof-eval.ts --repo-kb` as its own process, as the proof workflow does, against a small KB built only through the `kibi` CLI (`scripts/tests/repo-search-gold-gate.test.ts`).

- A gold set the KB answers passes with exit 0 and prints recall@3, the superseded-result rate, abstention precision and recall, and warm latency.
- A latency ceiling below what the KB achieves fails the gate and names the latency metrics.
- Superseding a requirement the gold set expects fails the gate on abstention precision and lists the false abstention.
- A gold question the CLI cannot answer fails the gate without printing an evaluation.
