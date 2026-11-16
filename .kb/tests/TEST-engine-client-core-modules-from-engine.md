---
title: Engine client core-module loading tests
status: passing
priority: must
tags:
  - engine
  - prolog
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:26.387Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-engine-client-core-modules-from-engine
      target: default
  success_policy: all_required_first_attempt
id: TEST-engine-client-core-modules-from-engine
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6b6a031ece91da7d004cf0cc
    test_id: TEST-engine-client-core-modules-from-engine
    scope: end_to_end
    outcome: passed
    code_snapshot: 53546bb57ef7ce30db6216bc7ba22697aebd96c970aeecc0dfa377320b9ecadb
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T10:00:53.966Z'
    finished_at: '2026-11-16T10:00:56.105Z'
    artifact_digest: 16e559b7ef46646e53efbf23c8cd9c9658a1108d846f61784153f17ab7301879
    contract_hash: 0dab8f101a1fd8dc17a0d8385aff2ae1071a60565d66288f778b515eaf31005f
    binding_hash: ff767649356990b26e1ca4a5c6ddf4b793e9721631c6c93cbcf9f88c62ed0f96
    fingerprint: 434a851c93d765149271e53b0e4d9cb4360414eebed270039dc643572cf5a7e9
    fingerprint_components:
      contract: 0dab8f101a1fd8dc17a0d8385aff2ae1071a60565d66288f778b515eaf31005f
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
      - symbol_id: SYM-test-engine-client-core-modules-from-engine
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Starts SWI-Prolog with kb.pl and discovery.pl loaded from one copy of the core and asks it, as a client of a second copy would, to load discovery.pl: a plain use_module of the second copy is refused with a redefine permission error, and the goal clients send loads the first copy (packages/cli/tests/prolog/core-module-goal.test.ts). The callers' goals are checked in their own suites.

A false pass would be a test whose two copies share one directory, so the redefine refusal never happens and the goal is never shown to pick the engine's copy.