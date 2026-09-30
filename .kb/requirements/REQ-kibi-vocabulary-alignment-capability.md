---
title: Vocabulary alignment is a builtin-first optional capability
status: open
priority: must
tags:
  - plugins
  - modeling
  - vocabulary-convergence
semantic_text: The builtin vocabulary-alignment provider must produce complete subject rankings and claim comparisons without network access. An activated vocabulary-alignment provider may run from kb_model_requirement. kb_check must never call a vocabulary-alignment provider. A failed replace-mode vocabulary-alignment provider must fall back to the builtin provider with fallbackUsed stamped.
semantic_clauses:
  - The builtin vocabulary-alignment provider must produce complete subject rankings and claim comparisons without network access.
  - An activated vocabulary-alignment provider may run from kb_model_requirement.
  - kb_check must never call a vocabulary-alignment provider.
  - A failed replace-mode vocabulary-alignment provider must fall back to the builtin provider with fallbackUsed stamped.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d3d7d02352095773deeda8e0060350427e8591154642f865bb0a765cda23cccb
logic_claims:
  - CLAIM-EB551244C65C7E27
  - CLAIM-60128A601055692F
  - CLAIM-6B989EA398629F55
  - CLAIM-DA2FD0C3D582E9AC
semantic_inventory:
  - claim_key: CLAIM-EB551244C65C7E27
    claim_text: The builtin vocabulary-alignment provider must produce complete subject rankings and claim comparisons without network access
    role: normative
    status: modeled
    span:
      start: 0
      end: 125
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-60128A601055692F
    claim_text: An activated vocabulary-alignment provider may run from kb_model_requirement
    role: descriptive
    status: modeled
    span:
      start: 127
      end: 203
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-6B989EA398629F55
    claim_text: kb_check must never call a vocabulary-alignment provider
    role: normative
    status: modeled
    span:
      start: 205
      end: 261
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
  - claim_key: CLAIM-DA2FD0C3D582E9AC
    claim_text: A failed replace-mode vocabulary-alignment provider must fall back to the builtin provider with fallbackUsed stamped
    role: normative
    status: modeled
    span:
      start: 263
      end: 379
    reason: Grounded by a predicate fact over the narrow vocabulary-convergence schemas.
id: REQ-kibi-vocabulary-alignment-capability
type: req
---
The builtin vocabulary-alignment provider must produce complete subject rankings and claim comparisons without network access. An activated vocabulary-alignment provider may run from kb_model_requirement. kb_check must never call a vocabulary-alignment provider. A failed replace-mode vocabulary-alignment provider must fall back to the builtin provider with fallbackUsed stamped.
