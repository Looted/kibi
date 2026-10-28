---
title: The Kibi signoff chat view shall show at most 15 rows
status: active
fact_kind: property_value
subject_key: kibi.signoff_views.output
claim_key: CLAIM-D2526E4DB4D51D99
claim_text: The Kibi signoff chat view shall show at most 15 rows
text_ref: REQ-kibi-signoff-brief-location
property_key: markdown_row_limit
operator: eq
value_type: int
value_int: 15
origin:
  kind: agent
  recorded_at: '2026-10-28T10:14:59.833Z'
id: FACT-signoff-markdown-limit
type: fact
---
SIGNOFF_BRIEF_DIR in packages/cli/src/signoff/model.ts is the directory REQ-kibi-signoff-views names for the latest JSON, Markdown and HTML views, and SIGNOFF_MARKDOWN_LIMIT in packages/cli/src/signoff/markdown.ts is how many rows the chat view shows before leaving the rest to the HTML view. Both are stated here so they are proved against the constants.