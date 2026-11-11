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
    receipt_id: PR-462cdbd0451151d3dbf563da
    test_id: TEST-e2e-skillopt-trust-boundaries
    scope: end_to_end
    outcome: passed
    code_snapshot: c05f77bba7df77f015b0b2d3c442676cd9c4f40576ae886f262844f8bf718d9b
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T10:06:32.031Z'
    finished_at: '2026-11-10T10:06:34.297Z'
    artifact_digest: 206bfdec2fa3a8f8e13c439ce12ce3383f45852d9739f0114fd250c62f21408e
    contract_hash: 9020824a8e1d04d5bdf1177ebadc073b9c5a92e28cc227941f1dd81f3a509009
    binding_hash: 52d17fd243f5139638d021ce2689535a0d0f4bfdc52eff8a30ea452a42ada1a8
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
