---
title: SWI-Prolog code proofs through kibi prove with the packed CLI
status: passing
tags:
  - proof
  - certificate
  - prolog
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-31T08:35:20.716Z'
id: TEST-kibi-multilingual-code-proofs
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-prolog-code-proofs
      target: default
  success_policy: all_required_first_attempt
---
Packs the CLI, installs it with kibi-plugin-treesitter into a SWI-Prolog project and runs kibi prove on Prolog proof files that read operator/2, status/1, detected/1 and transition/3 through the certificate module the kibi-usage skill ships. The operator set, its count, the detection rule and the transition table are proved; a domain missing an operator, a looser rule and a table with an extra transition are rejected.