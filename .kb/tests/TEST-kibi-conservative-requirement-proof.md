---
id: TEST-kibi-conservative-requirement-proof
title: Conservative requirement proof report tests
status: passing
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: packages/core/tests/kb.plt
tags:
  - requirements
  - proof
  - prolog
  - cli
  - mcp
  - e2e
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: SCEN-kibi-conservative-requirement-proof
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-conservative-requirement-proof-chain
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b8922010b57b17193530f7ec
    test_id: TEST-kibi-conservative-requirement-proof
    scope: integration
    outcome: passed
    code_snapshot: 4f27e9b2b2c7cf29e22be49a1789910470c7432fa60042ba1eb9cb152985fa6a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-24T19:34:42.468Z'
    finished_at: '2026-11-24T19:35:11.281Z'
    artifact_digest: d618d7d2e04c3c4957e95625087337e52652a6eeb19676dd22f2975443d2a9f0
    contract_hash: 6fca1d15c40cc5f85c9d09af7fad4174203475e2a02e3622b2365c88b14c613a
    binding_hash: f892843411f8f38fb803fafa88670e061923385b0d7be92b698420173a051911
    fingerprint: c90e7768818b86786448ca4566590ae7fef4aebb5e037def02aa82cc030005b9
    fingerprint_components:
      contract: 6fca1d15c40cc5f85c9d09af7fad4174203475e2a02e3622b2365c88b14c613a
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
      - symbol_id: SYM-test-conservative-requirement-proof-chain
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies the conservative requirement-proof contract through core Prolog, the CLI command surface, and the MCP adapter. It covers structural false positives, complete proof chains, semantic-inventory RDF round trips, refresh-before-extract source-coordinate persistence, executable-versus-production symbol classification, stable proof gaps, ranked repairs, and compatibility of existing coverage fields.
