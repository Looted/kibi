---
title: Documentation site renders repository sources and fails on broken links
status: passing
tags:
  - docs
  - site
  - pages
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-docs-site-pages-build
      target: default
  success_policy: all_required_first_attempt
id: TEST-docs-site-pages
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8f008a72c2ca37948bda5c4c
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: ef12a403e9e64829a55ee9164cf0e1cc8b3c8ad5725f2e86a1828be2d97b7d05
    fingerprint: 1b2d9390342d5aa3032922ebd9029e138c9573297cdcf75eb6ef8268a7a578dc
    fingerprint_components:
      contract: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
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
      - symbol_id: SYM-docs-site-pages-build
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
This builds the site from repository docs and fails on any broken internal link. Source: PR 289.
