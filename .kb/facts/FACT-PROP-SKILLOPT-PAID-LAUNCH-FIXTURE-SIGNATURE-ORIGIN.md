---
title: Paid launch fixture signatures declare deterministic nonexternal provenance
status: active
fact_kind: property_value
subject_key: skillopt.paid_launch.fixture_signer
property_key: fixture_signature_provenance_is_deterministic_and_not_externally_signed
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: skillopt.paid_launch.fixture_signer.fixture_signature_provenance_is_deterministic_and_not_externally_signed.eq.true
claim_key: CLAIM-5BE77E3C3E73A342
claim_text: 'Deterministic test-fixture signatures must declare `signatureProvenance: deterministic-test-fixture` and `externallySigned: false`; fixture evidence must never claim external signing.\n\nThis is intentionally an umbrella requirement because one paid launch crosses the external trust client, capability gateway, crash-safe accounting, reconciliation, and independently parsed receipt chain'
tags:
  - strict-lane
id: FACT-PROP-SKILLOPT-PAID-LAUNCH-FIXTURE-SIGNATURE-ORIGIN
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
