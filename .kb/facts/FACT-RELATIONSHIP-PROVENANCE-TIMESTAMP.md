---
title: Every RDF relationship has timestamp provenance
status: active
text_ref: documentation/requirements/REQ-005.md
tags:
  - lane:ontology
  - strict-semantics
fact_kind: predicate
polarity: assert
predicate_namespace: kibi.domain
predicate_name: relationship_provenance_policy
predicate_args:
  - rdf
  - relationship_triple
  - timestamp
canonical_key: relationship_provenance_policy(rdf,relationship_triple,timestamp)
claim_key: CLAIM-0E945281945C4055
claim_text: Each relationship triple is stored in RDF with a provenance timestamp
links:
  - type: relates_to
    target: FACT-RELATIONSHIP-AUDIT-METADATA
id: FACT-RELATIONSHIP-PROVENANCE-TIMESTAMP
type: fact
---
Each relationship triple is stored in RDF with a provenance timestamp.

