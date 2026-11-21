---
title: The acknowledged supersedes reason rule shall be supersedes-reason-acknowledged, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-supersedes-acknowledged-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-decision-firmness-supersedes-reason-acknowledged-rule
  proves:
    - CLAIM-D6F1B2CD2BC64534
origin:
  kind: agent
  recorded_at: '2026-10-28T20:23:16.633Z'
id: TEST-proof-supersedes-acknowledged-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1a8fc9ce00a4805cef71e104
    test_id: TEST-proof-supersedes-acknowledged-rule
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 7af4fe5631a36cf2ea08deb7c18f01ee3a138273bdad28bbb9015dda02c1939a
    binding_hash: 7d6863264635e043eb2e1f49e8d57bfe6afadd3a3f1ddf7a515bb5e467697fb4
    fingerprint: 08b92b75a613b9017e155a3b62fce057d281bbb73a71ec3d318b62fb399165d6
    fingerprint_components:
      contract: 7af4fe5631a36cf2ea08deb7c18f01ee3a138273bdad28bbb9015dda02c1939a
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
      - symbol_id: SYM-proof-supersedes-acknowledged-rule
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-supersedes-acknowledged-rule
      pattern:
        symbol_id: SYM-decision-firmness-supersedes-reason-acknowledged-rule
        type: string
        value: supersedes-reason-acknowledged
    certificate_digest: 6312564c9bf48dff54921be251dd8cb18f262d09d514e04699038e24ea4df90d
    claim_bindings:
      - claim_key: CLAIM-D6F1B2CD2BC64534
        requirement_id: REQ-kibi-symbol-and-supersede-rule-names
        fact_id: FACT-supersedes-acknowledged-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: supersedes-reason-acknowledged
---
Proves that the acknowledged supersedes reason rule shall be supersedes-reason-acknowledged, against the code Kibi reads at ingest.