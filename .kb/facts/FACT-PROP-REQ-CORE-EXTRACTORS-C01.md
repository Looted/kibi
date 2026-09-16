---
title: Kibi extracts entities and relationships from source files using specialized ext
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: req.req_core_extractors
property_key: clause_01_kibi_extracts_entities_and_relationships_from_so
operator: eq
value_type: bool
value_bool: true
polarity: require
canonical_key: req.req_core_extractors.clause_01_kibi_extracts_entities_and_relationships_from_so.eq.true
claim_key: CLAIM-C2DE8571B0CEC508
claim_text: 'Kibi extracts entities and relationships from source files using specialized extractors:\nMarkdown extractor: Parses YAML frontmatter for core entity types and interprets Markdown links as `relates_to` edges.\nSymbol extractor: Parses `symbols.yaml` to import code symbol definitions into the KB.\nTyped relationship objects in Markdown frontmatter are imported with their explicit types.\n\nSymbol coordinate refreshes must keep authored metadata in `symbols.yaml` and generated locations in `symbol-coordinates.yaml`'
id: FACT-PROP-REQ-CORE-EXTRACTORS-C01
type: fact
---
