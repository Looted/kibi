---
id: REQ-skillopt-automatic-adoption
title: Passing SkillOpt candidates must self-improve the canonical skill
status: open
created_at: 2026-07-24T00:00:00.000Z
updated_at: 2026-07-24T00:00:00.000Z
source: docs/skillopt.md
priority: must
tags:
  - skillopt
  - codex
  - evaluation
  - security
  - self-improvement
links:
  - type: specified_by
    target: SCEN-skillopt-automatic-adoption
  - type: verified_by
    target: TEST-skillopt-automatic-adoption
  - type: supersedes
    target: REQ-skillopt-codex-optimization
semantic_text: |-
  After Codex-only preflight and smoke checks pass, a generated SkillOpt candidate must pass automatic safety and immutable-surface validation before it is adopted into the canonical skill and synchronized mirrors. Automatic adoption must use the transactional rollback path, must never claim a behavioral evaluation pass when none was run, and must not commit or push source changes.

  The explicit report, proposal, and reviewer approval workflow remains available for higher-assurance behavioral evaluation and offline artifacts.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 027f5a8eb547553ab2ee56655a59ba47608476e65cee85cbd443e874a95b1943
semantic_inventory:
  - claim_key: CLAIM-A1CD6ED7D5D130F7
    claim_text: After Codex-only preflight and smoke checks pass, a generated SkillOpt candidate must pass automatic safety and immutable-surface validation before it is adopted into the canonical skill and synchronized mirrors
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 211
    payload_hash: 11345cc9cd64814ccf59a5cc2da92419b657512bd47a817b470cd40c0b8636d9
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-2979131FC2043527
    claim_text: Automatic adoption must use the transactional rollback path, must never claim a behavioral evaluation pass when none was run, and must not commit or push source changes
    role: normative
    status: ontology_gap
    span:
      start: 213
      end: 381
    payload_hash: 11345cc9cd64814ccf59a5cc2da92419b657512bd47a817b470cd40c0b8636d9
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-8C3B47A08FA5150A
    claim_text: The explicit report, proposal, and reviewer approval workflow remains available for higher-assurance behavioral evaluation and offline artifacts
    role: descriptive
    status: ambiguous
    span:
      start: 384
      end: 528
    payload_hash: 11345cc9cd64814ccf59a5cc2da92419b657512bd47a817b470cd40c0b8636d9
    reason: No accepted typed interpretation grounds this assertive proposition.
logic_claims:
  - CLAIM-A1CD6ED7D5D130F7
  - CLAIM-2979131FC2043527
  - CLAIM-8C3B47A08FA5150A
type: req
---

After Codex-only preflight and smoke checks pass, a generated SkillOpt candidate must pass automatic safety and immutable-surface validation before it is adopted into the canonical skill and synchronized mirrors. Automatic adoption must use the transactional rollback path, must never claim a behavioral evaluation pass when none was run, and must not commit or push source changes.

The explicit report, proposal, and reviewer approval workflow remains available for higher-assurance behavioral evaluation and offline artifacts.
