---
title: Consumer CLI reports the sessions that edited requirement-linked code before looking it up
status: passing
priority: must
tags:
  - telemetry
  - usage-metrics
  - acceptance
  - hooks
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-telemetry-lookup-before-first-edit-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-telemetry-lookup-before-first-edit-cli
    target: default
    native_id: packages/cli/tests/consumer/telemetry-lookup-before-first-edit.test.ts::telemetry lookup before first edit through the kibi CLI::reports the session that edited a requirement-linked file before kb_search or kb_query and credits the session that looked it up first
    source_file: packages/cli/tests/consumer/telemetry-lookup-before-first-edit.test.ts
    line: 187
origin:
  kind: agent
  recorded_at: '2026-10-04T05:30:34.573Z'
id: TEST-kibi-telemetry-lookup-before-first-edit-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-7f65730683be905561fb3509
    test_id: TEST-kibi-telemetry-lookup-before-first-edit-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: f0fd27d161e0f366d0e4027f08bc1530db0ab8379a4a8d6801b80cf635d125ea
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-04T06:03:29.215Z'
    finished_at: '2026-10-04T06:03:35.204Z'
    artifact_digest: 816999281b62f3a485a468da08e16ddcac833e238d4fe052e820be8120f422e8
    contract_hash: 1015878a3963eeb4a54649d5eb9c8ebcaf18dab19630171a049776b1f922bd1f
    binding_hash: ec9116032ae45f8ae25da20e12d66d8f5f34a3346aab45ea9aee64ab42a0b3f2
    fingerprint: 7185c09a0acfbf151625e334e33781fa842d96054da67ee808715c66d26a1e2e
    fingerprint_components:
      contract: 1015878a3963eeb4a54649d5eb9c8ebcaf18dab19630171a049776b1f922bd1f
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 958e42bd216ed67387b27f00fdbef1d0108fb64aee0c20df9cd3642fe79060b9
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-telemetry-lookup-before-first-edit-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# Consumer CLI reports the sessions that edited requirement-linked code before looking it up

Drives `kibi usage-metrics`, `kibi usage-remediation` and `kibi check` through the built `kibi` binary over a usage log of real CLI operation rows and host hook rows (`packages/cli/tests/consumer/telemetry-lookup-before-first-edit.test.ts`).

- `lookup_before_first_edit` reports the session that edited requirement-linked code before any `kb_search` or `kb_query` and credits the session that looked it up first; hook rows never count toward the operation window.
- `--require-acceptance` fails the run and still prints the report, remediation points at the log line of the unguided edit, and `kibi check` carries the same finding as a non-blocking diagnostic.
- The metric passes when every session looked up first, and is not applicable when no requirement-linked file was edited.
