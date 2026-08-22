---
id: SCEN-kibi-logical-requirement-coverage
title: Compound prose is fully grounded and checked for contradictions
status: active
created_at: 2026-08-04T00:00:00.000Z
updated_at: 2026-08-04T00:00:00.000Z
source: documentation/scenarios/SCEN-kibi-logical-requirement-coverage.md
tags:
  - requirements
  - prolog
  - semantic-advisor
  - contradictions
links:
  - type: verified_by
    target: TEST-kibi-logical-requirement-coverage
type: scenario
---

Given a requirement body containing multiple atomic normative clauses, when the semantic advisor and modeling tools prepare its logical representation, then every clause has a stable key, every key is preserved on a linked ground strict-property or predicate fact, repeated modeling calls merge the requirement manifest, and `logic-coverage` reports missing or orphaned ground claims.

Given two current requirements that require opposite polarities over the same predicate namespace, name, and ordered ground arguments, when `domain-contradictions` runs, then the pair is reported as a blocking contradiction.

Given any current requirement without a logical-claim manifest, when quality diagnostics run, then Kibi reports non-blocking backfill debt regardless of title wording. Given an explicit manifest, the default unfiltered check validates its ground correspondence.

Given a fact whose `claim_key` does not match the stable key derived from its `claim_text`, when the fact enters through a Kibi mutation or Markdown sync surface, then Kibi rejects it before persistence.

Given clause text that differs only by trailing sentence or conjunction punctuation, when stable identities are derived, then both forms receive the same claim key. Given one claim linked to multiple ground facts or multiple claim keys linked to the same ground term, when `logic-coverage` runs, then it reports the non-bijective representation.

Given an exact entity query whose source has multiple relationships with one type, when Prolog properties are decoded, then every target remains present rather than the last target overwriting earlier ones.

Given logical-coverage fields in an MCP tool contract, when Kibi converts the authoritative JSON Schema through its runtime Zod registration, then claim-key patterns, logic-claim uniqueness, and paired claim provenance remain advertised and enforced.

Given staged requirements, predicate facts, and verification tests, when Kibi projects them into its temporary validation graph, then requirement manifests, all typed predicate fields, and typed verification metadata remain intact.
