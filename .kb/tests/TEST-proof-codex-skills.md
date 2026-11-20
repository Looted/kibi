---
title: 'Source proof: kibi-codex bundles the Kibi skills'
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:49:05.400Z'
id: TEST-proof-codex-skills
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-codex-skills
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: glob
    pattern: packages/codex/skills/*/SKILL.md
    capture: true
  proves:
    - CLAIM-3C03F93E59BE963F
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bdc2192190ff054e0a4102e5
    test_id: TEST-proof-codex-skills
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 12d8554dc021d85eae53c2b7bb5c82e94024a60f425408ab61d248b65dbbfd91
    binding_hash: 165a305a4e539b9203903b5bf75e1f81ec36c0f65deda4529d09012bd5767d79
    fingerprint: 46f041ca04a8be8226856a0dbfb0b541d9dab4b372eea5e46bfa723e42058cea
    fingerprint_components:
      contract: 12d8554dc021d85eae53c2b7bb5c82e94024a60f425408ab61d248b65dbbfd91
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
      - symbol_id: SYM-proof-codex-skills
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
      test_id: TEST-proof-codex-skills
      source:
        reader: glob
        pattern: packages/codex/skills/*/SKILL.md
        capture: true
      model:
        members:
          - kibi-bootstrap
          - kibi-commit-review
          - kibi-decisions
          - kibi-freshness
          - kibi-provable-code
          - kibi-traceability
          - kibi-usage
    certificate_digest: 5ed5b843dbf09b970e99deb2d135de4aba9e04165e7ce46c146c6b119213cde1
    claim_bindings:
      - claim_key: CLAIM-3C03F93E59BE963F
        requirement_id: REQ-codex-plugin-package
        fact_id: FACT-codex-bundled-skills
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - kibi-bootstrap
            - kibi-commit-review
            - kibi-decisions
            - kibi-freshness
            - kibi-provable-code
            - kibi-traceability
            - kibi-usage
          operator: eq
---
Globs packages/codex/skills/*/SKILL.md and checks the six skill names are present.