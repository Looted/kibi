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
    receipt_id: PR-3a9c80b36969bc0d1baa226d
    test_id: TEST-docs-site-pages
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 0028e51ff52651edcf95da47a23b761ac6e5f78b9a7bd46229aa1fcef068c2c2
    binding_hash: 81efa2080b84334215898ea04fe52c67ee6b4c8ca798490082a74ce203e4209e
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
