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
    receipt_id: PR-3cefb4b5c4f8915d0a1910fa
    test_id: TEST-proof-supersedes-acknowledged-rule
    scope: unit
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:30:42.284Z'
    finished_at: '2026-11-04T18:30:42.424Z'
    artifact_digest: 6bc878e9babf3148785a5c872d7557ec24109dd600450942a94ca5471f55ecc1
    contract_hash: 7af4fe5631a36cf2ea08deb7c18f01ee3a138273bdad28bbb9015dda02c1939a
    binding_hash: be720bbcb6546a03fe161055b9392654929facba6dc9c9bd88827c86c47ae340
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