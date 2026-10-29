---
title: A subject key derived from a requirement ID is reported by subject-key-identity
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:15:31.123Z'
id: SCEN-NEG-kibi-subject-vocabulary-REQ-DERIVED-SUBJECT
type: scenario
---
Given a subject fact whose subject key is req.req_billing_session_ttl, named after a requirement instead of a component, when kibi check runs subject-key-identity, then that fact is reported as a non-blocking subject-key-identity finding and no other subject is.

This is the failure side of the shared subject vocabulary: a requirement-shaped subject key would stop two requirements about the same component from meeting on one subject. documentation/tests/e2e/packed/vocabulary-convergence.test.ts "reports advisory redundancy, vocabulary, and naming findings and reuses subjects" exercises it through FACT-SUBJ-REQ-BILLING-SESSION-TTL.
