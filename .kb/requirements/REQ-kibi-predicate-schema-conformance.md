---
title: Kibi reports predicate facts that do not match a schema
status: open
priority: must
tags:
  - ontology
  - validation
  - vocabulary-convergence
semantic_text: Kibi check must report a predicate fact with no schema for its namespace, name, and arity as a predicate-schema-conformance warning. Kibi check must report a predicate fact that uses an undeclared argument constant as a predicate-schema-conformance warning. Predicate facts in the default namespace that match the built-in predicate catalog must not be reported by predicate-schema-conformance.
semantic_clauses:
  - Kibi check must report a predicate fact with no schema for its namespace, name, and arity as a predicate-schema-conformance warning.
  - Kibi check must report a predicate fact that uses an undeclared argument constant as a predicate-schema-conformance warning.
  - Predicate facts in the default namespace that match the built-in predicate catalog must not be reported by predicate-schema-conformance.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2b9bc6cc5e4c15d552eb05206434fd81462117eb2a8b8652b61d712503a519f5
logic_claims:
  - CLAIM-16463B2F63CFD582
  - CLAIM-320CB2C9E465DDBA
  - CLAIM-B0A9BB1F9853B9C8
semantic_inventory:
  - claim_key: CLAIM-16463B2F63CFD582
    claim_text: Kibi check must report a predicate fact with no schema for its namespace, name, and arity as a predicate-schema-conformance warning
    role: normative
    status: modeled
    span:
      start: 0
      end: 131
    reason: Grounded by a predicate fact over a narrow policy schema with a declared vocabulary.
  - claim_key: CLAIM-320CB2C9E465DDBA
    claim_text: Kibi check must report a predicate fact that uses an undeclared argument constant as a predicate-schema-conformance warning
    role: normative
    status: modeled
    span:
      start: 133
      end: 256
    reason: Grounded by a predicate fact over a narrow policy schema with a declared vocabulary.
  - claim_key: CLAIM-B0A9BB1F9853B9C8
    claim_text: Predicate facts in the default namespace that match the built-in predicate catalog must not be reported by predicate-schema-conformance
    role: normative
    status: modeled
    span:
      start: 258
      end: 393
    reason: Grounded by a predicate fact over a narrow policy schema with a declared vocabulary.
id: REQ-kibi-predicate-schema-conformance
type: req
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Kibi check must report a predicate fact with no schema for its namespace, name, and arity as a predicate-schema-conformance warning. Kibi check must report a predicate fact that uses an undeclared argument constant as a predicate-schema-conformance warning. Predicate facts in the default namespace that match the built-in predicate catalog must not be reported by predicate-schema-conformance.
