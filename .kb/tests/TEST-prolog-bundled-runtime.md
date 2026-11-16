---
title: Resolver, package metadata, and launch environment controls
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - prolog
  - bundle
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-prolog-bundled-runtime
      target: default
  success_policy: all_required_first_attempt
id: TEST-prolog-bundled-runtime
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5fb976d0226133c43d2f5144
    test_id: TEST-prolog-bundled-runtime
    scope: end_to_end
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:26:12.883Z'
    finished_at: '2026-11-16T12:26:22.509Z'
    artifact_digest: a8485fb3a9f4975edc1d689f24b65393f33e073909733f7cbb46233beb4bee55
    contract_hash: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
    binding_hash: e570a4d64b2488711702bd2aaef83dc7465a1953b321f2f35d73e148f3d2cf16
    fingerprint: 624776195c4301e4cf1a3285b2aa0b7a02619f1e28fa8b9075ffe7751f3b650f
    fingerprint_components:
      contract: 491923387cac8ea18a94d9b738c0bf8838c21f773762bb7a520896a604aff83e
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
      - symbol_id: SYM-test-prolog-bundled-runtime
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 4): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This checks the resolver, the platform package metadata (`os`, `cpu`, `libc`, no install scripts) and the launch environment, which must set `SWI_HOME_DIR` for a bundle.
