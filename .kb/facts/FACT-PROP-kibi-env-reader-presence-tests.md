---
title: The env references reader must read nothing from code that only tests the global object or an alias of it for presence, and must refuse a file that hands the global object on to other code
status: active
fact_kind: property_value
subject_key: kibi.source_proof
property_key: env_reader_presence_test_misreads
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-B63D707DF7C6C27F
claim_text: The env references reader must read nothing from code that only tests the global object or an alias of it for presence, and must refuse a file that hands the global object on to other code
text_ref: REQ-kibi-env-reader-presence-tests
origin:
  kind: agent
  recorded_at: '2026-11-16T11:06:23.319Z'
id: FACT-PROP-kibi-env-reader-presence-tests
type: fact
---
Counts the files the env references reader gets wrong on the global object: a presence test it refuses or reads from, or a hand-on it accepts. The requirement holds when the count is zero.