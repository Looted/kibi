---
title: A maintainer proves a requirement with a certificate Kibi re-checks
status: active
priority: should
tags:
  - proof
  - certificate
origin:
  kind: agent
  recorded_at: '2026-10-24T19:31:42.330Z'
id: SCEN-kibi-code-proof-kinds
type: scenario
---
Given a repository whose tests declare proof contracts of kind exhaustive, typecheck, arithmetic and smt, when the maintainer runs kibi prove and each test leaves a kibi.code-certificate.v1 in KIBI_PROOF_CERTIFICATES, then the exhaustive proof that imports its domain, the typecheck witness with a never check, the arithmetic claim its assumptions entail and the SMT query the solver answers unsat each get a kibi.proof-receipt.v2 at evidence level proved. A proof that hand-lists its domain, an arithmetic claim the assumptions do not entail and an e2e test stay at tested, and each rejection says why. When every linked scenario of a requirement that is tested end to end also has such a proved test, kibi coverage reports the requirement as proved; a receipt whose certificate no longer re-checks keeps it tested.