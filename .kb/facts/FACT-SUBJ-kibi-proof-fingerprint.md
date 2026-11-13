---
title: 'Proof receipt fingerprint'
status: active
fact_kind: subject
subject_key: kibi.proof.receipt_fingerprint
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: FACT-SUBJ-kibi-proof-fingerprint
type: fact
---

The effective fingerprint a proof receipt records: a hash over the proof contract plus the integration's command, bindings and producer, stored with its components, and a separate canonical environment hash. It identifies what was run, not whether the run passed.
