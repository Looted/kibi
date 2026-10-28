---
title: The symbol coordinates format version shall be 2
status: active
fact_kind: property_value
subject_key: kibi.symbols.coordinates
claim_key: CLAIM-EEBE9761ABA24406
claim_text: The symbol coordinates format version shall be 2
text_ref: REQ-generated-coordinate-settings
property_key: format_version
operator: eq
value_type: int
value_int: 2
origin:
  kind: agent
  recorded_at: '2026-10-28T11:13:20.473Z'
id: FACT-symbol-coordinates-format-version
type: fact
---
REQ-generated-coordinate-persistence keeps symbol coordinates out of the authored manifest: the generated fields are the line and column bounds and their timestamp, and the derived coordinates file carries a format version. Both are stated here so they are proved against the constants.