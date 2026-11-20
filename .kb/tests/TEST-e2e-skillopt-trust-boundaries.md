---
title: SkillOpt external trust boundaries fail closed through the real CLIs
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-skillopt-trust-boundaries
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-e2e-skillopt-trust-boundaries
    target: default
    native_id: documentation/tests/e2e/skillopt-trust-boundaries.e2e.ts::skillopt trust boundary e2e
id: TEST-e2e-skillopt-trust-boundaries
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6067af246ea1fb2473215b4a
    test_id: TEST-e2e-skillopt-trust-boundaries
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 9020824a8e1d04d5bdf1177ebadc073b9c5a92e28cc227941f1dd81f3a509009
    binding_hash: db8913414a88ceee63950023dc2d9085d75802c791e083e7744b257128184856
    fingerprint: 88e534076ad7041d09154b93c898e71b247f6063a280809d0ee97a038a1bd02e
    fingerprint_components:
      contract: 9020824a8e1d04d5bdf1177ebadc073b9c5a92e28cc227941f1dd81f3a509009
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 49332de63a630349120d3b5bb6e6d11f1136214f4d797f1cca1f3c0129d4c5de
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-skillopt-trust-boundaries
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
This drives the real SkillOpt CLIs through every refusal path. It turned a missing Codex executable from a raw ENOENT crash into a typed prerequisite error with a durable gate receipt.
