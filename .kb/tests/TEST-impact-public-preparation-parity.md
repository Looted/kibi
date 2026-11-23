---
title: Public impact-review preparation parity preserves exact scope and unauthored state
status: passing
text_ref: packages/cli/tests/parity/harness.test.ts
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-impact-public-preparation-parity
      target: default
  success_policy: all_required_first_attempt
verification_perspective: internal
tags:
  - multilingual
  - impact-policy
  - public-preparation
  - structural-evidence
id: TEST-impact-public-preparation-parity
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well."'
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-507d41e61c1626e4e61a20b4
    test_id: TEST-impact-public-preparation-parity
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 0486e043c2605d47fa92092306281fbb6e41c144638d72e5a4c3833c34e35556
    binding_hash: 78ff654b6f2ba88d289243963a3981bdb077e0fc1f94de77738743b2128797bd
    fingerprint: 48bd879cceb8b194e7e74d40926fcdb6a142b47ef24e1096805b348b3b570f60
    fingerprint_components:
      contract: 0486e043c2605d47fa92092306281fbb6e41c144638d72e5a4c3833c34e35556
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
      - symbol_id: SYM-unit-test-impact-public-preparation-parity
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---


## Context
The CLI and MCP preparation must return the same exact scope and the same unauthored template, because they are peer surfaces.
