---
title: Requirements that name one subject meet in its domain view
status: active
priority: must
tags:
  - kb
  - domain-subjects
origin:
  kind: agent
  recorded_at: '2026-11-12T20:00:00.000Z'
id: SCEN-kb-domain-subject-layer
type: scenario
---
**Scenario: two prose requirements about one view**

**GIVEN** a defined subject for a drawing and a narrower defined subject for its read-only view, and two prose requirements whose claims name the read-only view: one says the view locks the drawing, the other says the review editor opens in that view
**WHEN** an agent runs `kibi sync`, then `kb_query` with factKind subject for the read-only view and for the drawing
**THEN** the read-only view's domain view lists both requirements beside its definition, and the drawing's lists the read-only view as narrower
**AND** `kibi check` reports nothing under the subject rules until a requirement adds a claim that names no subject, or a subject nobody defined, and then it reports exactly that requirement.

Kibi does not decide whether the two claims conflict; it makes sure whoever writes the second one reads the first.
