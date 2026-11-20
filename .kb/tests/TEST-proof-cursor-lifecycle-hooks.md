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
    receipt_id: PR-ec35cbb037dc2b7969493cf5
    test_id: TEST-proof-cursor-lifecycle-hooks
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: ceda58aa6b8ca63529112417f6972331bc9a70f29b1f18d33e7d9151c877a860
    binding_hash: 752b2d123e01b694f7124952243f5afa1ff4f933f57690b8a4be39a714f49fa5
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
        scope: source
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
