---
title: The generated symbol fields shall be sourceLine, sourceColumn, sourceEndLine, sourceEndColumn and coordinatesGeneratedAt
status: active
fact_kind: property_value
subject_key: kibi.symbols.coordinates
claim_key: CLAIM-5A378556E38551B7
claim_text: The generated symbol fields shall be sourceLine, sourceColumn, sourceEndLine, sourceEndColumn and coordinatesGeneratedAt
text_ref: REQ-generated-coordinate-settings
property_key: generated_fields
operator: eq
value_type: set
value_set:
  - sourceLine
  - sourceColumn
  - sourceEndLine
  - sourceEndColumn
  - coordinatesGeneratedAt
origin:
  kind: agent
  recorded_at: '2026-10-28T11:13:19.624Z'
id: FACT-generated-symbol-fields
type: fact
---
REQ-generated-coordinate-persistence keeps symbol coordinates out of the authored manifest: the generated fields are the line and column bounds and their timestamp, and the derived coordinates file carries a format version. Both are stated here so they are proved against the constants.