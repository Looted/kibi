# Kibi Modeling Guidance and Error Ergonomics Implementation Plan

> **Archival note:** Agent operating guidance now lives in bundled Kibi skills (`kibi-usage`, `init-kibi`). Historical mentions of `docs/prompts/llm-rules.md` below are not current runbooks.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kibi's semantic modeling lane discoverable and hard to misuse, so agents can model requirements as strict facts or ontology predicates without falling back to prose after opaque validation errors.

**Architecture:** Improve the agent path at three layers: documentation/prompt guidance, MCP tool schemas/examples, and actionable validation errors. Keep the existing `fact` entity model and predicate tools; do not invent a new ontology layer until round-trip and usability gaps are fixed.

**Tech Stack:** TypeScript MCP server (`packages/mcp`), CLI/public JSON schemas from `kibi-cli`, SWI-Prolog-backed KB validation, Markdown docs/prompts, Bun tests.

---

## Context and Problem Statement

Align's KB analysis exposed a repeatable agent failure mode:

- Kibi already exposes strict fact fields (`fact_kind`, `subject_key`, `property_key`, `operator`, `value_type`, `value_*`) and ontology predicate fields (`predicate_name`, `predicate_args`, `canonical_key`, `polarity`, `closed_world`).
- `kb_suggest_predicates` and `kb_model_requirement` already provide modeling assistance and apply plans.
- An Align agent attempted to create a property fact with camelCase fields (`subjectKey`, `propertyKey`, `value`) and received only `Entity validation failed: root: must NOT have additional properties`.
- The agent then retried using prose-only `links`/`text_ref`, creating a structurally weak `requires_property` relationship to a non-typed fact.

This means the missing value is not primarily more predicate theory. It is agent ergonomics: exact field names, examples in the tool surface, preflight guidance, and corrective errors that tell the agent what to do next.

## File Structure

### Documentation and guidance

- Modify: `docs/mcp-reference.md` — add a semantic modeling quick path, strict fact and predicate examples, and common error recovery notes.
- Modify: `docs/entity-schema.md` — tighten fact-lane examples, add a legacy prose vs typed fact decision table, and normalize examples to schema-supported values.
- Modify: `docs/prompts/llm-rules.md` — add copy-paste agent workflow rules for discovery → modeling helper → sequential upsert → verification.
- Modify: `AGENTS.md` — add a short maintainer rule: typed facts use snake_case only; use `kb_suggest_predicates` before ontology prose.
- Modify or add bundled Kibi usage skill resource under `packages/cli/src/public/skills/kibi-usage/resources/` after locating the exact manifest entry.

### MCP tooling and errors

- Modify: `packages/mcp/src/tools-config.ts` — improve `kb_upsert`, `kb_model_requirement`, and `kb_suggest_predicates` schema descriptions.
- Modify: `packages/mcp/src/tools/upsert.ts` — replace generic additional-property errors with actionable diagnostics.
- Optionally create: `packages/mcp/src/tools/modeling-diagnostics.ts` — pure formatter for schema/modeling hints.
- Modify: `packages/mcp/src/tools/model-requirement.ts` — add structured warning text when low confidence downgrades a requirement to observation.
- Modify: `packages/mcp/src/tools/suggest-predicates.ts` — enrich ontology-gap rationale and next-step guidance.

### Tests

- Modify: `packages/mcp/tests/tools/upsert.test.ts` — camelCase alias, missing strict fact fields, predicate shape, and Align-style regression tests.
- Modify: `packages/mcp/tests/tools/model-requirement.test.ts` — low-confidence downgrade warning tests.
- Modify: `packages/mcp/tests/tools/suggest-predicates.test.ts` — ontology-gap next-step tests.
- Modify: `packages/mcp/tests/server/tools-coverage.test.ts` — schema description coverage.
- Modify: `packages/cli/tests/modeling-guidance.test.ts` and/or `packages/mcp/tests/docs.test.ts` — docs content assertions.
- Add a changeset if package behavior changes.

---

## Task 1: Document the agent semantic-modeling quick path

**Files:**
- Modify: `docs/mcp-reference.md`
- Modify: `docs/entity-schema.md`
- Modify: `docs/prompts/llm-rules.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Add a quick path section to `docs/mcp-reference.md`**

Add before `kb_model_requirement`:

```markdown
## Semantic Modeling Quick Path

When prose contains a machine-checkable rule, do not store it only in `text_ref` or freeform `links`.

1. For property/value requirements, call `kb_model_requirement` or create:
   - `fact_kind: subject` with `subject_key`
   - `fact_kind: property_value` with `subject_key`, `property_key`, `operator`, `value_type`, and exactly one `value_*`
   - requirement relationships: `constrains` + `requires_property`
2. For ontology claims, call `kb_suggest_predicates` first.
   - If a candidate fits, apply the returned `fact_kind: predicate` payload and link with `requires_predicate`.
   - If no candidate fits, record the returned `review:ontology-gap` observation instead of inventing prose-only ontology.
3. Use snake_case field names exactly as the MCP schema shows. Do not use camelCase aliases such as `subjectKey` or generic `value`.
```

- [ ] **Step 2: Add canonical payload examples**

Add strict property and predicate examples:

```json
{
  "type": "fact",
  "id": "FACT-VOICE-DRAFT-PRESERVES-METADATA",
  "properties": {
    "title": "Voice draft preserves metadata",
    "status": "active",
    "source": "docs/facts/voice-recording.md",
    "fact_kind": "property_value",
    "subject_key": "voice_recording.draft",
    "property_key": "preserves_existing_metadata",
    "operator": "eq",
    "value_type": "bool",
    "value_bool": true,
    "canonical_key": "voice_recording.draft.preserves_existing_metadata.eq.true"
  }
}
```

```json
{
  "type": "fact",
  "id": "FACT-ANNOTATION-TIMEKEY-UNIQUE-SLOT",
  "properties": {
    "title": "Annotation timeKey slots are unique per analysis",
    "status": "active",
    "source": "docs/facts/annotation-timekey.md",
    "fact_kind": "predicate",
    "predicate_name": "unique_annotation_slot",
    "predicate_args": ["analysis_id", "time_key"],
    "polarity": "assert",
    "closed_world": true,
    "canonical_key": "unique_annotation_slot(analysis_id,time_key)"
  }
}
```

- [ ] **Step 3: Add a decision table to `docs/entity-schema.md`**

Include this table:

| Prose says... | Use | Relationship |
| --- | --- | --- |
| “X must equal/limit/be at most Y” | `subject` + `property_value` | `constrains` + `requires_property` |
| “When A happens, B must transition/save/discard/guard C” | `predicate` from `kb_suggest_predicates` | `requires_predicate` |
| “We observed a bug/workaround/test exception” | `observation` | `relates_to` or source links |
| “Process/governance note” | `meta` | `relates_to` |

- [ ] **Step 4: Update prompt guidance**

Add to `docs/prompts/llm-rules.md` and `AGENTS.md`:

```markdown
If a requirement contains a normative, machine-checkable claim, model it as a strict fact or ontology predicate before falling back to prose. Use `kb_model_requirement` for subject/property claims and `kb_suggest_predicates` for predicate claims. Typed fact properties are snake_case only.
```

- [ ] **Step 5: Verify docs tests**

Run:

```bash
bun test packages/cli/tests/modeling-guidance.test.ts packages/mcp/tests/docs.test.ts
```

Expected: PASS after content assertions are updated.

---

## Task 2: Improve `kb_upsert` schema descriptions and examples

**Files:**
- Modify: `packages/mcp/src/tools-config.ts`
- Modify: `packages/mcp/tests/server/tools-coverage.test.ts`

- [ ] **Step 1: Strengthen field descriptions**

Update descriptions around `fact_kind`, `subject_key`, `property_key`, `operator`, `value_type`, `value_*`, `predicate_name`, and `predicate_args`.

Example target text:

```ts
description:
  "Snake_case only. For fact_kind='property_value', canonical subject key such as 'voice_recording.draft'. Do not use subjectKey.",
```

- [ ] **Step 2: Add modeling guidance to `kb_upsert` description**

Mention:

- use `kb_model_requirement` before hand-writing strict property facts when starting from prose;
- use `kb_suggest_predicates` before hand-writing ontology predicate facts;
- relationship endpoints must exist before linking unless upserting the source entity with relationships.

- [ ] **Step 3: Add schema coverage tests**

In `packages/mcp/tests/server/tools-coverage.test.ts`, assert descriptions include:

```ts
expect(entityProperties.subject_key.description).toContain("Snake_case");
expect(entityProperties.subject_key.description).toContain("Do not use subjectKey");
expect(entityProperties.predicate_name.description).toContain("kb_suggest_predicates");
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
bun test packages/mcp/tests/server/tools-coverage.test.ts
```

Expected: PASS.

---

## Task 3: Add actionable validation diagnostics for unknown and malformed fact fields

**Files:**
- Modify: `packages/mcp/src/tools/upsert.ts`
- Optionally create: `packages/mcp/src/tools/modeling-diagnostics.ts`
- Modify: `packages/mcp/tests/tools/upsert.test.ts`

- [ ] **Step 1: Write failing tests for camelCase aliases**

Add a test that upserts a fact with `subjectKey`, `propertyKey`, and `value`.

Expected error should contain:

```text
Unknown property 'subjectKey'. Use 'subject_key'.
Unknown property 'propertyKey'. Use 'property_key'.
For property facts, replace generic 'value' with value_type plus one of value_string, value_int, value_number, value_bool.
```

- [ ] **Step 2: Write failing tests for incomplete `property_value` facts**

Payload:

```ts
properties: {
  title: "Incomplete property fact",
  status: "active",
  source: "test://fact",
  fact_kind: "property_value",
  subject_key: "voice_recording.draft"
}
```

Expected error should name missing `property_key`, `operator`, `value_type`, and exactly one `value_*`.

- [ ] **Step 3: Write failing tests for incomplete `predicate` facts**

Expected error should name missing `predicate_name`, non-empty `predicate_args`, and `canonical_key`.

- [ ] **Step 4: Implement diagnostic helper**

Implement a pure helper similar to:

```ts
const KNOWN_PROPERTY_ALIASES = new Map([
  ["subjectKey", "subject_key"],
  ["propertyKey", "property_key"],
  ["predicateName", "predicate_name"],
  ["predicateArgs", "predicate_args"],
  ["closedWorld", "closed_world"],
]);

function formatEntityValidationErrors(entity: Record<string, unknown>, errors: ErrorObject[]): string {
  // Preserve AJV details, then append modeling hints for aliases and fact_kind shapes.
}
```

Do not silently accept aliases. The agent must correct the payload.

- [ ] **Step 5: Wire helper into `handleKbUpsert`**

Replace the current generic AJV join with the new formatter.

- [ ] **Step 6: Run targeted tests**

Run:

```bash
bun test packages/mcp/tests/tools/upsert.test.ts
```

Expected: PASS.

---

## Task 4: Warn when structural relationships target legacy prose facts

**Files:**
- Modify: `packages/mcp/src/tools/upsert.ts`
- Modify: `packages/mcp/tests/tools/upsert.test.ts`
- Modify: `docs/mcp-reference.md`

- [ ] **Step 1: Add tests for `requires_property` targeting legacy facts**

Mock Prolog so target fact exists but lacks `fact_kind`.

Expected behavior for migration compatibility:

- do not fail existing permissive behavior;
- return a warning in `content[0].text` or `structuredContent.warnings` if extending the result shape is acceptable.

Suggested warning:

```text
Relationship requires_property points to FACT-X, but the target fact has no fact_kind=property_value. This is allowed for legacy migration but will not participate in strict contradiction checks. Add a typed property_value fact when possible.
```

- [ ] **Step 2: Implement migration warning**

Extend `UpsertResult.structuredContent` with optional `warnings?: string[]` if compatible with existing clients.

- [ ] **Step 3: Document the warning**

Add to `docs/mcp-reference.md` error/warning handling section.

- [ ] **Step 4: Run targeted tests**

Run:

```bash
bun test packages/mcp/tests/tools/upsert.test.ts packages/mcp/tests/server/tools.test.ts
```

Expected: PASS.

---

## Task 5: Improve modeling helper feedback

**Files:**
- Modify: `packages/mcp/src/tools/model-requirement.ts`
- Modify: `packages/mcp/src/tools/suggest-predicates.ts`
- Modify: `packages/mcp/tests/tools/model-requirement.test.ts`
- Modify: `packages/mcp/tests/tools/suggest-predicates.test.ts`
- Modify: `docs/mcp-reference.md`

- [ ] **Step 1: Add low-confidence downgrade warnings**

When `kb_model_requirement` emits an observation because confidence is below threshold, include a warning like:

```text
Modeled as observation because confidence 0.62 is below strict threshold 0.70. If this is a normative requirement, provide subjectKey, propertyKey, operator, and value explicitly or retry with higher-confidence extracted claim fields.
```

- [ ] **Step 2: Add ontology-gap next steps**

When `kb_suggest_predicates` returns `record_ontology_gap`, include next steps:

- create `fact_kind: predicate_schema` if this is recurring domain language;
- otherwise keep observation tagged `review:ontology-gap`;
- do not invent unsupported predicate names without schema.

- [ ] **Step 3: Test both warnings**

Run:

```bash
bun test packages/mcp/tests/tools/model-requirement.test.ts packages/mcp/tests/tools/suggest-predicates.test.ts
```

Expected: PASS.

---

## Task 6: Add a project KB modeling skill/resource

**Files:**
- Inspect existing skill subsystem before editing.
- Modify bundled Kibi usage skill resources under `packages/cli/src/public/skills/kibi-usage/`.
- Modify relevant skill tests if present.

- [ ] **Step 1: Locate bundled Kibi skill resources**

Use repo search for `kibi-usage` and `kb_skills_load`.

- [ ] **Step 2: Add a “Modeling KB claims” resource**

Include:

- strict fact examples;
- ontology predicate examples;
- when to use observation/meta;
- exact `kb_upsert` payloads;
- common validation errors and fixes;
- Align-style camelCase failure example.

- [ ] **Step 3: Reference the resource in OpenCode prompt guidance**

Where Kibi prompt guidance tells agents to use public MCP tools, also tell them to load the Kibi usage skill when modeling facts or predicates.

- [ ] **Step 4: Run package tests**

Run relevant package tests after locating skill subsystem:

```bash
bun test packages/mcp/tests packages/opencode/tests
```

Expected: PASS or narrow to affected tests if full suite is slow.

---

## Task 7: Validate with an Align-style regression fixture

**Files:**
- Create: `packages/mcp/tests/tools/modeling-guidance-regression.test.ts` or add to `packages/mcp/tests/tools/upsert.test.ts`

- [ ] **Step 1: Reproduce the Align failure**

Test payload:

```ts
await handleKbUpsert(prolog, {
  type: "fact",
  id: "FACT-VR-DRAFT-METADATA-PRESERVED",
  properties: {
    title: "Voice recording draft metadata is preserved",
    status: "active",
    source: "docs/facts/voice-recording.md",
    subjectKey: "VoiceRecording.Draft",
    propertyKey: "Preserves Existing Draft Metadata",
    operator: "eq",
    value: true,
  },
});
```

- [ ] **Step 2: Assert the new error teaches the fix**

Expected error mentions:

- `subject_key`
- `property_key`
- `value_type: "bool"`
- `value_bool: true`
- `kb_model_requirement` as the safer route from prose.

- [ ] **Step 3: Add a passing corrected payload**

Use:

```ts
properties: {
  title: "Voice recording draft metadata is preserved",
  status: "active",
  source: "docs/facts/voice-recording.md",
  fact_kind: "property_value",
  subject_key: "voice_recording.draft",
  property_key: "preserves_existing_metadata",
  operator: "eq",
  value_type: "bool",
  value_bool: true,
  canonical_key: "voice_recording.draft.preserves_existing_metadata.eq.true",
}
```

- [ ] **Step 4: Run the regression test**

Run:

```bash
bun test packages/mcp/tests/tools/modeling-guidance-regression.test.ts
```

Expected: PASS.

---

## Task 8: Final verification and release metadata

**Files:**
- Create: `.changeset/<short-name>.md` if any package behavior or public docs change.

- [ ] **Step 1: Run typecheck/build**

Run:

```bash
bun run build:mcp
bun run build:opencode
```

Expected: exit code 0.

- [ ] **Step 2: Run targeted tests**

Run:

```bash
bun test packages/mcp/tests/tools/upsert.test.ts
bun test packages/mcp/tests/tools/suggest-predicates.test.ts
bun test packages/mcp/tests/tools/model-requirement.test.ts
bun test packages/mcp/tests/server/tools-coverage.test.ts
bun test packages/cli/tests/modeling-guidance.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run lint/check**

Run:

```bash
bun run check
```

Expected: PASS.

- [ ] **Step 4: Add changeset**

If MCP behavior changed, add a changeset for `kibi-mcp`; if OpenCode prompt guidance changed, include `kibi-opencode`.

The changeset must start with a human-facing summary before technical bullets.

---

## Non-Goals

- Do not add a new entity type.
- Do not require all legacy prose facts to migrate immediately.
- Do not silently accept camelCase aliases; that hides model drift.
- Do not expand the ontology catalog before fixing round-trip, examples, and errors.
- Do not make `strict-fact-shape` default-blocking for existing legacy KBs.
- Do not route agents toward the CLI for routine MCP-safe modeling work.

## Success Criteria

- Agents can see exact typed fact field names in the MCP tool schema and docs.
- A malformed Align-style payload produces a corrective error, not a generic AJV message.
- `kb_model_requirement` and `kb_suggest_predicates` are presented as the default routes from prose to structure.
- Structural relationships to legacy prose facts produce migration warnings.
- Docs and prompts clearly distinguish strict/predicate facts from `text_ref` prose.
- Targeted tests prove the corrected Align-style property fact round-trips through `kb_upsert`.
