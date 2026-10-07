---
title: Unmodeled requirements linked to modeled ones are blocked
status: open
priority: must
tags:
  - checks
  - contradictions
  - semantic-inventory
semantic_text: Kibi must report a current requirement that keeps missing propositions while it relates_to a current requirement modeled with strict property or ground predicate facts as a related-requirement-unmodeled violation. Kibi must treat related-requirement-unmodeled as a canonical blocking check. Kibi must name the modeled subject and property keys or predicate keys of the related requirement in the finding. Kibi must not report a requirement that has no proposition ledger or whose related requirement is superseded.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 36e044923d7b7c7559f10eab86c4a914fc07e8df1c4dcfd5b46f23bce5160392
logic_claims:
  - CLAIM-7C4258D705582C46
  - CLAIM-4F66A7DE8485C86A
  - CLAIM-A864AC8D70FE7F6C
  - CLAIM-79573DCD917D74B3
semantic_inventory:
  - claim_key: CLAIM-7C4258D705582C46
    claim_text: Kibi must report a current requirement that keeps missing propositions while it relates_to a current requirement modeled with strict property or ground predicate facts as a related-requirement-unmodeled violation
    role: normative
    status: modeled
    span:
      start: 0
      end: 212
    reason: Grounded by the unresolved_ledger_next_to_modeled_requirement_reported property on the check subject.
  - claim_key: CLAIM-4F66A7DE8485C86A
    claim_text: Kibi must treat related-requirement-unmodeled as a canonical blocking check
    role: normative
    status: modeled
    span:
      start: 214
      end: 289
    reason: Grounded by the enforcement_class property on the check subject.
  - claim_key: CLAIM-A864AC8D70FE7F6C
    claim_text: Kibi must name the modeled subject and property keys or predicate keys of the related requirement in the finding
    role: normative
    status: modeled
    span:
      start: 291
      end: 403
    reason: Grounded by the finding_names_modeled_keys property on the check subject.
  - claim_key: CLAIM-79573DCD917D74B3
    claim_text: Kibi must not report a requirement that has no proposition ledger or whose related requirement is superseded
    role: normative
    status: modeled
    span:
      start: 405
      end: 513
    reason: Grounded by the ledgerless_or_superseded_reported property set to false on the check subject.
origin:
  kind: agent
  recorded_at: '2026-10-07T13:24:03.858Z'
id: REQ-check-related-requirement-unmodeled
type: req
---
Kibi must report a current requirement that keeps missing propositions while it relates_to a current requirement modeled with strict property or ground predicate facts as a related-requirement-unmodeled violation. Kibi must treat related-requirement-unmodeled as a canonical blocking check. Kibi must name the modeled subject and property keys or predicate keys of the related requirement in the finding. Kibi must not report a requirement that has no proposition ledger or whose related requirement is superseded.

## Context

Issue 364 reported that an agent changed how messaging works, recorded the change as a new requirement whose semantic-advisor ledger was left entirely unmodeled, linked it with relates_to to the modeled requirement it overlapped, and `kb_check` stayed clean. `domain-contradictions` compares grounded facts that share a canonical key, `logic-coverage` skips missing propositions by design and `semantic-completeness` is a migration diagnostic that only runs when selected, so nothing asked for the new claims to be modeled against the subject the older requirement constrains. The relates_to edge is the author saying the two overlap, which makes the unresolved ledger a blocking gap rather than migration debt. Requirements with no ledger stay in the strict-readiness lane; they predate the advisor and are handled by that migration diagnostic.