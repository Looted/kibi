---
title: kibi --help lists first sentences and leaves out the narrow routes
status: passing
priority: must
tags:
  - tool-surface
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-cli-operation-metadata-tests
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T20:00:00.000Z'
id: TEST-cli-help-command-summaries
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fa60349c3d2c5bb207c06681
    test_id: TEST-cli-help-command-summaries
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 4288c46a19914bd3b34ce3c3b88514d726a56f63929d013991be70dbf94b5d41
    binding_hash: 7ad4c40facab11278a65218878ad6f3267f4e42461f422d25904f22a09bae74b
    fingerprint: 0ab9ead17b881e0eefce62cd89547b840744dc1fd301af3ed290f51e8590a95e
    fingerprint_components:
      contract: 4288c46a19914bd3b34ce3c3b88514d726a56f63929d013991be70dbf94b5d41
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
      - symbol_id: SYM-cli-operation-metadata-tests
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Asserts commandSummary's first-sentence rule (packages/cli/tests/cli-operation-metadata.test.ts), that the JSON-only commands list their first sentence, keep the full description in their own help, and that the narrow routes are registered but not listed (cli-register-json-mutation.test.ts), and the foundation and reporting command surfaces with their summaries (cli-register-foundation.test.ts, cli-register-reporting.test.ts).