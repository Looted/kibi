---
title: README and landing page follow the published documentation catalog
status: passing
tags:
  - docs
  - readme
  - llms
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-docs-readme-published-links
      target: default
  success_policy: all_required_first_attempt
id: TEST-docs-readme-published-links
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a519cd4fab3c96eb7eb7cd14
    test_id: TEST-docs-readme-published-links
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
    binding_hash: 7efb764183823cdbcd1afecbe47a97b9c560d40c335fe4a80648cdb88a67a77e
    fingerprint: 5908e8dc8c8404e4b1c81506cd15e3d728d59bfab103cc1227cc2a1d0d8fd291
    fingerprint_components:
      contract: 2cddacf1901ddd737cf4e6c873d3c381bf1e2cb8c96b1f170afcc83f3a201f2f
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
      - symbol_id: SYM-docs-readme-published-links
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
The doc catalog is the only map from a source file to a published page. This test fails if the README links a catalog source directly, or if a published URL isn't in the catalog. Source: PR 297.
