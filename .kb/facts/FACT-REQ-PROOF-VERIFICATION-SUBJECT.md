---
id: FACT-REQ-PROOF-VERIFICATION-SUBJECT
title: Kibi verification evidence subject
status: active
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
tags:
  - lane:strict
  - verification
  - e2e
fact_kind: subject
subject_key: kibi.proof.verification
canonical_key: kibi
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

How proof-bearing tests are bound to stable proof obligations: each obligation has a stable symbol identity, executable test symbols connect to it, and only fresh matching receipts count, while retries, skips, failures and mismatched fingerprints stay non-proof. It is the binding, not receipt storage.
