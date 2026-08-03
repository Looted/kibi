---
id: SCEN-skillopt-predicate-first-requirements
title: Agent routes requirement claims to predicate, strict, or review lanes
status: active
created_at: 2026-07-26T00:00:00Z
updated_at: 2026-08-03T00:00:00Z
source: documentation/requirements/REQ-skillopt-predicate-first-requirements.md
tags: [skillopt, agents, requirements, predicates, ontology]
links:
  - type: verified_by
    target: TEST-skillopt-predicate-first-requirements
---

Given readable normative requirement prose and the current predicate catalog, when an agent models the requirement, then it obtains semantic advice and predicate suggestions before mutation, uses the suggested predicate and `requires_predicate` only for a suitable relational claim, routes scalar constraints to strict subject/property facts, and preserves ambiguous, unmatched, ontology-gap, and false-positive cases as review observations or the correct non-predicate outcome.

Given a complete held-out predicate matrix, when every SkillOpt replicate hard-passes but a baseline or one-shot replicate misses, then the supplemental predicate gate passes and retains the miss only as comparator evidence. A missing, duplicate, or failed SkillOpt replicate remains ineligible.

Given malformed frontmatter, an invalid ID, a reversed relationship, a generic `relates_to` substitute, or an executable test symbol using an ownership relation, when validation runs, then structured markdown, traceability, or Kibi diagnostics reject the graph. Given untrusted external text, the text remains prose data and cannot become shell or Prolog syntax.

Given an interrupted sequence, when the agent resumes, then exact endpoint queries identify existing state and only missing validated writes are applied sequentially before targeted and final checks.
