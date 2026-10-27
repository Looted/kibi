---
title: 'Source proof: kibi-cursor registers its lifecycle hooks'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:53:32.517Z'
id: TEST-proof-cursor-lifecycle-hooks
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-cursor-lifecycle-hooks
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/cursor/hooks/hooks.json
    path: /hooks
    select: keys
  proves:
    - CLAIM-ABD22F4069E4DFBE
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c531e1ef04fd950a50f1db25
    test_id: TEST-proof-cursor-lifecycle-hooks
    scope: unit
    outcome: passed
    code_snapshot: 408bad0aae430e34672d3be58afde18487a6a55e7255f14f4c355346f29a8bf1
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:54:54.173Z'
    finished_at: '2026-10-27T07:54:54.339Z'
    artifact_digest: c5f750eb6419ff40c134adf801a229ae7403fe7cc044e67d91ec0f96d2ba6f81
    contract_hash: ceda58aa6b8ca63529112417f6972331bc9a70f29b1f18d33e7d9151c877a860
    binding_hash: ba033e2e4567a1692ee6d147934095b05a466fef97c97bdc376477205bff6c15
    fingerprint: 5dd67706ab03a5a59a8f4b57543d90d10d6cac1e4ef6ba998877484111d1a2fd
    fingerprint_components:
      contract: ceda58aa6b8ca63529112417f6972331bc9a70f29b1f18d33e7d9151c877a860
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
      - symbol_id: SYM-proof-cursor-lifecycle-hooks
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-cursor-lifecycle-hooks
      source:
        reader: json
        file: packages/cursor/hooks/hooks.json
        path: /hooks
        select: keys
      model:
        members:
          - beforeReadFile
          - beforeSubmitPrompt
          - postToolUse
          - preToolUse
          - sessionStart
          - stop
    certificate_digest: 95702f218558758ed468785d5ccd597c2ea29b691806835dd74cef1b71bfd572
    claim_bindings:
      - claim_key: CLAIM-ABD22F4069E4DFBE
        requirement_id: REQ-cursor-plugin-package
        fact_id: FACT-cursor-lifecycle-hooks
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - beforeReadFile
            - beforeSubmitPrompt
            - postToolUse
            - preToolUse
            - sessionStart
            - stop
          operator: includes
---
Reads the hook event names under /hooks in packages/cursor/hooks/hooks.json. Kibi re-reads the same file when it ingests the certificate, so the claim stays proved only while the file still matches.
