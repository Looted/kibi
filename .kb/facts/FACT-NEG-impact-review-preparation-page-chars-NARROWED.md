---
title: 'Failure side: a preparation page''s data is at most 24,000 characters'
status: active
fact_kind: property_value
subject_key: kibi.impact_review.preparation
property_key: preparation_page_data_chars
operator: gt
value_type: int
value_int: 24000
tags:
  - negative-path
  - impact-policy
  - public-preparation
origin:
  kind: agent
  recorded_at: '2026-11-19T21:00:00.000Z'
id: FACT-NEG-impact-review-preparation-page-chars-NARROWED
type: fact
---
The failure side of REQ-impact-review-preparation-paging: given the same scope, a page whose fingerprint or file count describes only its own rows fails the preparation and result-budget tests' assertions.